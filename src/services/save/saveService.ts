import type { KeyValueStore, SaveData, SaveService } from '../../platform/types';
import { consoleLogger } from '../log';
import type { Logger } from '../log';
import { decodeSlot, encodeSlot, isNewerEnvelope } from './envelope';
import { SAVE_LIMITS, defaultSave, parseSave, sanitizeSave } from './schema';

/**
 * Storage keys. Stable: never rename, never reuse for another purpose.
 *
 * The save lives in two slots. Each write goes to the slot that does NOT hold the
 * current good save, with a sequence number one higher; on load the intact slot
 * with the highest sequence wins. A write that is cut short leaves a slot whose
 * checksum fails, so the previous slot is still the newest intact one.
 */
export const SAVE_KEYS = {
  slotA: 'nixelune.save.a',
  slotB: 'nixelune.save.b',
  /** Raw value of a slot that could not be used or needed repair, per slot. */
  corruptA: 'nixelune.save.corrupt.a',
  corruptB: 'nixelune.save.corrupt.b',
  /** Raw slot value written by a newer build than this one. Never deleted here. */
  newer: 'nixelune.save.newer',
} as const;

type SlotName = 'a' | 'b';
const SLOT_KEY: Record<SlotName, string> = { a: SAVE_KEYS.slotA, b: SAVE_KEYS.slotB };
const CORRUPT_KEY: Record<SlotName, string> = { a: SAVE_KEYS.corruptA, b: SAVE_KEYS.corruptB };
const SLOTS: readonly SlotName[] = ['a', 'b'];

function other(slot: SlotName): SlotName {
  return slot === 'a' ? 'b' : 'a';
}

type SlotRead =
  | { readonly slot: SlotName; readonly kind: 'absent' }
  | { readonly slot: SlotName; readonly kind: 'unreadable' }
  | { readonly slot: SlotName; readonly kind: 'damaged'; readonly raw: string }
  | { readonly slot: SlotName; readonly kind: 'newer'; readonly raw: string }
  | { readonly slot: SlotName; readonly kind: 'intact'; readonly raw: string; readonly seq: number; readonly payload: string };

function clone(data: SaveData): SaveData {
  return JSON.parse(JSON.stringify(data)) as SaveData;
}

export class VersionedSaveService implements SaveService {
  private current: SaveData = defaultSave();
  private loading: Promise<SaveData> | null = null;
  private loaded = false;
  /** Slot holding the newest value that must not be overwritten by the next write. */
  private activeSlot: SlotName | null = null;
  private seq = 0;
  /** False when the stored state could not be read or protected: keep playing in memory only. */
  private persistent = true;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: KeyValueStore,
    private readonly log: Logger = consoleLogger,
  ) {}

  get data(): SaveData {
    return this.current;
  }

  /** False when this session cannot write (storage unreadable, or a newer save could not be protected). */
  get isPersistent(): boolean {
    return this.persistent;
  }

  load(): Promise<SaveData> {
    this.loading ??= this.doLoad().catch((error: unknown) => {
      // doLoad guards every store call; this is the last line of defence.
      this.log('save', 'load failed unexpectedly, running on defaults without persistence', error);
      this.persistent = false;
      this.loaded = true;
      return this.current;
    });
    return this.loading;
  }

  update(mutate: (draft: SaveData) => void): Promise<void> {
    if (!this.loaded) return this.load().then(() => this.update(mutate));
    let snapshot: SaveData;
    try {
      const draft = clone(this.current);
      mutate(draft);
      // The draft comes from game/UI code: clamp it like stored data so a bad value never reaches disk.
      snapshot = sanitizeSave(draft).data;
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
    this.current = snapshot;
    const payload = JSON.stringify(snapshot);
    this.queue = this.queue.then(() => this.persist(payload));
    return this.queue;
  }

  private async doLoad(): Promise<SaveData> {
    const reads: SlotRead[] = [];
    for (const slot of SLOTS) reads.push(await this.readSlot(slot));

    if (reads.some((read) => read.kind === 'unreadable')) {
      // Writing now could destroy a save we merely failed to read.
      this.persistent = false;
      this.log('save', 'storage could not be read; progress in this session will not be stored');
    }

    for (const read of reads) {
      if (read.kind === 'intact') this.seq = Math.max(this.seq, read.seq);
    }

    const newerEnvelope = reads.find((read) => read.kind === 'newer');
    const intact = reads
      .filter((read) => read.kind === 'intact')
      .sort((x, y) => y.seq - x.seq);

    let chosen: SaveData | null = null;
    if (newerEnvelope) {
      await this.protectNewer(newerEnvelope.slot, newerEnvelope.raw);
    } else {
      for (const read of intact) {
        const outcome = this.parsePayload(read.payload);
        if (outcome.kind === 'ok') {
          if (outcome.repaired) {
            this.log('save', `slot ${read.slot} held invalid fields; they were reset`);
            await this.backup(CORRUPT_KEY[read.slot], read.raw);
          }
          chosen = outcome.data;
          this.activeSlot = read.slot;
          break;
        }
        if (outcome.kind === 'newer') {
          this.log('save', `slot ${read.slot} was written by a newer version (${outcome.version})`);
          await this.protectNewer(read.slot, read.raw);
          break;
        }
        this.log('save', `slot ${read.slot} is corrupt (${outcome.reason})`);
        await this.backup(CORRUPT_KEY[read.slot], read.raw);
      }
    }

    if (!chosen && !newerEnvelope) {
      // Nothing usable: keep whatever damaged bytes there are before they get overwritten.
      for (const read of reads) {
        if (read.kind === 'damaged') {
          this.log('save', `slot ${read.slot} is damaged`);
          await this.backup(CORRUPT_KEY[read.slot], read.raw);
        }
      }
    }

    this.current = chosen ?? defaultSave();
    this.loaded = true;
    return this.current;
  }

  private parsePayload(payload: string): ReturnType<typeof parseSave> {
    let value: unknown;
    try {
      value = JSON.parse(payload);
    } catch {
      return { kind: 'corrupt', reason: 'payload is not JSON' };
    }
    return parseSave(value);
  }

  /**
   * A newer build's save: copy it aside and run on defaults. Once the copy is confirmed
   * the next write may reuse that slot (so this build's own progress is found again on
   * the next start). If the copy fails, stop writing so the newer save is never destroyed.
   */
  private async protectNewer(slot: SlotName, raw: string): Promise<void> {
    if (!this.persistent) return;
    const kept = await this.backup(SAVE_KEYS.newer, raw);
    if (kept) {
      this.activeSlot = other(slot);
    } else {
      this.persistent = false;
      this.log('save', 'newer save could not be backed up; progress in this session will not be stored');
    }
  }

  private async readSlot(slot: SlotName): Promise<SlotRead> {
    let raw: string | null = null;
    let failure: unknown;
    let read = false;
    // One retry: a transient bridge error must not cost the player their progress.
    for (let attempt = 0; attempt < 2 && !read; attempt += 1) {
      try {
        raw = await this.store.get(SLOT_KEY[slot]);
        read = true;
      } catch (error) {
        failure = error;
      }
    }
    if (!read) {
      this.log('save', `reading slot ${slot} failed`, failure);
      return { slot, kind: 'unreadable' };
    }
    if (raw === null) return { slot, kind: 'absent' };
    if (typeof raw !== 'string' || raw.length > SAVE_LIMITS.maxRawLength) {
      return { slot, kind: 'damaged', raw: String(raw).slice(0, SAVE_LIMITS.maxRawLength) };
    }
    const content = decodeSlot(raw);
    if (content) return { slot, kind: 'intact', raw, seq: content.seq, payload: content.payload };
    if (isNewerEnvelope(raw)) return { slot, kind: 'newer', raw };
    return { slot, kind: 'damaged', raw };
  }

  /** Copies a raw value to a backup key and confirms it arrived. */
  private async backup(key: string, raw: string): Promise<boolean> {
    if (!this.persistent) return false;
    try {
      await this.store.set(key, raw);
      return (await this.store.get(key)) === raw;
    } catch (error) {
      this.log('save', `backup to ${key} failed`, error);
      return false;
    }
  }

  private async persist(payload: string): Promise<void> {
    if (!this.persistent) return;
    const target: SlotName = this.activeSlot ? other(this.activeSlot) : 'a';
    const seq = this.seq + 1;
    const raw = encodeSlot({ seq, payload });
    try {
      await this.store.set(SLOT_KEY[target], raw);
      // Flip only after the new slot reads back intact; until then the old slot stays current.
      if ((await this.store.get(SLOT_KEY[target])) !== raw) throw new Error('slot did not read back as written');
      this.activeSlot = target;
      this.seq = seq;
    } catch (error) {
      this.log('save', `writing slot ${target} failed; the previous save stays in place`, error);
    }
  }
}
