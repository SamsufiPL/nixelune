/** The six tiles and the ring of the kit's menu mockup, same coordinates, no glow. */
const SQ = Math.sqrt(3) / 2;

function hexPoints(cx: number, cy: number, r: number): string {
  const p = [
    [cx + SQ * r, cy + r / 2],
    [cx, cy + r],
    [cx - SQ * r, cy + r / 2],
    [cx - SQ * r, cy - r / 2],
    [cx, cy - r],
    [cx + SQ * r, cy - r / 2],
  ];
  return p.map(([x, y]) => `${(x ?? 0).toFixed(2)},${(y ?? 0).toFixed(2)}`).join(' ');
}

export function kitMenuArt(): SVGElement {
  const tiles: readonly (readonly [number, number, string])[] = [
    [402, 623, '#64D3C1'],
    [450, 695, '#8DBEF1'],
    [594, 623, '#F18479'],
    [642, 695, '#F0BD75'],
    [498, 767, '#B5A7E4'],
    [354, 839, '#64D3C1'],
  ];
  let body = '';
  for (const [x, y, fill] of tiles) {
    body +=
      `<polygon points="${hexPoints(x, y, 54)}" fill="${fill}" stroke="${fill}" stroke-width="2" stroke-linejoin="round" opacity="0.94"/>` +
      `<polygon points="${hexPoints(x, y, 39)}" fill="url(#nx-menu-bevel)" opacity="0.55"/>`;
  }
  const template = document.createElement('template');
  template.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="206 462 488 488" preserveAspectRatio="xMidYMid meet">' +
    '<defs><linearGradient id="nx-menu-bevel" x1="0" y1="0" x2="1" y2="1">' +
    '<stop stop-color="#FFFFFF" stop-opacity=".24"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity=".03"/>' +
    '<stop offset="1" stop-color="#000000" stop-opacity=".25"/></linearGradient></defs>' +
    '<circle cx="450" cy="706" r="232" fill="none" stroke="#D7AA75" stroke-width="1.5" opacity="0.42" vector-effect="non-scaling-stroke"/>' +
    body +
    '</svg>';
  return template.content.firstElementChild as SVGElement;
}
