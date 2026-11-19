/**
 * One stored slot: the save JSON wrapped with a sequence number and a checksum.
 * A slot whose checksum does not match its payload (torn or damaged write) is ignored.
 */
export interface SlotContent {
  readonly seq: number;
  /** The save as a JSON string. */
  readonly payload: string;
}

const ENVELOPE_FORMAT = 1;

/** FNV-1a, 32 bit, over UTF-16 code units; 8 hex digits. Detects damage, not tampering. */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function encodeSlot(content: SlotContent): string {
  return JSON.stringify({
    f: ENVELOPE_FORMAT,
    seq: content.seq,
    sum: checksum(`${content.seq}:${content.payload}`),
    payload: content.payload,
  });
}

/** True when the value looks like an envelope written by a later build (unknown, higher format). */
export function isNewerEnvelope(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return false;
    const f = (parsed as Record<string, unknown>).f;
    return typeof f === 'number' && Number.isInteger(f) && f > ENVELOPE_FORMAT;
  } catch {
    return false;
  }
}

/** Returns null for anything that is not an intact envelope of the known format. */
export function decodeSlot(raw: string): SlotContent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { f, seq, sum, payload } = parsed as Record<string, unknown>;
  if (f !== ENVELOPE_FORMAT) return null;
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1) return null;
  if (typeof payload !== 'string' || typeof sum !== 'string') return null;
  if (checksum(`${seq}:${payload}`) !== sum) return null;
  return { seq, payload };
}
