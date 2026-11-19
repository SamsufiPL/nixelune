/**
 * Interface icons: a handful of line glyphs drawn for this game on a 24 px grid with
 * a 1.75 px stroke, so they do not depend on which arrows a font happens to carry.
 */
const open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">';

export const ICONS = {
  /** Rotate by 60 degrees clockwise: an open arc with an arrow head. */
  rotate: `${open}<path d="M19.2 12a7.2 7.2 0 1 1-2.4-5.4"/><path d="M17.3 2.9v4.2h-4.2"/></svg>`,
  drop: `${open.replace('1.75', '2.25')}<path d="M12 4.5v14"/><path d="M6.2 13l5.8 5.8 5.8-5.8"/></svg>`,
  swap: `${open}<path d="M4 8.5h14.5"/><path d="M15 5l3.5 3.5L15 12"/><path d="M20 15.5H5.5"/><path d="M9 12l-3.5 3.5L9 19"/></svg>`,
  pause: `${open}<path d="M9 6v12"/><path d="M15 6v12"/></svg>`,
  back: `${open}<path d="M19 12H5.5"/><path d="M11 6l-6 6 6 6"/></svg>`,
  chevron: `${open}<path d="M9 5.5l6.5 6.5L9 18.5"/></svg>`,
  check: `${open}<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  left: `${open}<path d="M18 12H6"/><path d="M11 7l-5 5 5 5"/></svg>`,
  right: `${open}<path d="M6 12h12"/><path d="M13 7l5 5-5 5"/></svg>`,
  up: `${open}<path d="M12 18V6"/><path d="M7 11l5-5 5 5"/></svg>`,
  down: `${open}<path d="M12 6v12"/><path d="M7 13l5 5 5-5"/></svg>`,
} as const;
