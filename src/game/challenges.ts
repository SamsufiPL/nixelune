/**
 * The shipped challenges. Ids are persisted in saves: never reuse or renumber.
 * Every prefill is a settled board with no group of five or more; every challenge is
 * proven winnable within its piece limit by tools/solver.ts (tests/tools/solver.test.ts).
 * A change to shapes, the generator or the rules can break that proof - rerun it.
 */
import type { ChallengeDef } from './types';

export const CHALLENGES: readonly ChallengeDef[] = [
  // Close one path: four teal tiles wait for a fifth.
  {
    id: 'c01',
    seed: 101,
    prefill: [
      'c.......c',
      'c.tttt..c',
    ],
    goal: { kind: 'paths', target: 1 },
    pieceLimit: 3,
    colors: ['teal', 'coral'],
  },
  {
    id: 'c02',
    seed: 202,
    prefill: [
      '..c...t..',
      'ttc..ctt.',
      'ttc..cct.',
    ],
    goal: { kind: 'paths', target: 2 },
    pieceLimit: 4,
    colors: ['teal', 'coral'],
  },
  {
    id: 'c03',
    seed: 303,
    prefill: [
      '.i.....c.',
      'ti.t.c.ci',
      'tticcctci',
    ],
    goal: { kind: 'tiles', target: 12 },
    pieceLimit: 4,
    colors: ['teal', 'coral', 'ice'],
  },
  // First chain: clearing one colour lets the tiles above fall together.
  {
    id: 'c04',
    seed: 404,
    prefill: [
      'ci.....ct',
      'cii...cii',
      'ittt.tcti',
    ],
    goal: { kind: 'chain', target: 2 },
    pieceLimit: 3,
    colors: ['teal', 'coral', 'ice'],
  },
  {
    id: 'c05',
    seed: 505,
    prefill: [
      '...t.....',
      '..itc...t',
      '.tiict.ct',
      'iitctcici',
    ],
    goal: { kind: 'score', target: 2500 },
    pieceLimit: 4,
    colors: ['teal', 'coral', 'ice'],
  },
  // Lilac never arrives here: those tiles only move when the ones below are cleared.
  {
    id: 'c06',
    seed: 606,
    prefill: [
      'cl.....li',
      'lic...cll',
      'ltl...cti',
      'itit.ittl',
    ],
    goal: { kind: 'paths', target: 5 },
    pieceLimit: 7,
    colors: ['teal', 'coral', 'ice'],
  },
  {
    id: 'c07',
    seed: 707,
    prefill: [
      'i.......i',
      'il.....li',
      'ltl...ttc',
      'ictlitcic',
      'ttliiccti',
    ],
    goal: { kind: 'tiles', target: 40 },
    pieceLimit: 7,
    colors: ['teal', 'coral', 'ice', 'lilac'],
  },
  {
    id: 'c08',
    seed: 808,
    prefill: [
      '.l.l.t.c.',
      '.t.t.i.c.',
      'titittlit',
      'ticiiclti',
    ],
    goal: { kind: 'chain', target: 3 },
    pieceLimit: 8,
    colors: ['teal', 'coral', 'ice', 'lilac'],
  },
  {
    id: 'c09',
    seed: 909,
    prefill: [
      'c.......c',
      'li.....tt',
      'tlt...ict',
      'illc.ltic',
      'iiiclciic',
      'tltliiclt',
    ],
    goal: { kind: 'score', target: 8000 },
    pieceLimit: 10,
    colors: ['teal', 'coral', 'ice', 'lilac'],
  },
  {
    id: 'c10',
    seed: 1010,
    prefill: [
      'ill...iac',
      'ttct.ttli',
      'tcliiclti',
      'aatcciaca',
      'ialaiictt',
    ],
    goal: { kind: 'paths', target: 10 },
    pieceLimit: 11,
    colors: ['teal', 'coral', 'ice', 'lilac', 'amber'],
  },
  {
    id: 'c11',
    seed: 1111,
    prefill: [
      'ai.....ic',
      'taa...ctt',
      'ctlactlia',
      'cticaalcl',
      'iaillttcc',
      'iiliaitil',
    ],
    goal: { kind: 'chain', target: 3 },
    pieceLimit: 8,
    colors: ['teal', 'coral', 'ice', 'lilac', 'amber'],
  },
  {
    id: 'c12',
    seed: 1212,
    prefill: [
      'tl.....cc',
      'lct...cia',
      'catt.iitt',
      'tcctllcic',
      'accacictc',
      'ltacillil',
      'ctiattlli',
    ],
    goal: { kind: 'score', target: 15000 },
    pieceLimit: 28,
    colors: ['teal', 'coral', 'ice', 'lilac', 'amber'],
  },
];
