/* ------------------------------------------------------------------
   Engraved motifs — all hand-built SVG, drawn in thin strokes.
   Achaemenid rosette, Persepolis stepped merlon, lotus petal.
   ------------------------------------------------------------------ */
(function () {
  const GOLD = "#c9a86e";

  const polar = (r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)];
  };

  // Pointed lotus petal from radius r0 to r1, width w, rotated by deg.
  const petal = (r0, r1, w, deg) => {
    const mid = r0 + (r1 - r0) * 0.5;
    return `<path transform="rotate(${deg})" d="M0 ${-r0} Q ${w} ${-mid} 0 ${-r1} Q ${-w} ${-mid} 0 ${-r0} Z"/>`;
  };

  const rosette = (count, r0, r1, w, offset = 0) =>
    Array.from({ length: count }, (_, i) => petal(r0, r1, w, offset + i * 360 / count)).join("");

  // Persepolis stepped crenellation, one unit (width 24, height 20).
  const merlon = (x, y, s = 1) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 20 V14 H4 V8 H8 V2 H16 V8 H20 V14 H24 V20"/>`;

  /* ---------- Seal face: rings + engraved dotted band ---------- */
  function sealRings() {
    const dots = Array.from({ length: 72 }, (_, i) => {
      const [x, y] = polar(134.5, i * 5);
      return `<circle cx="${x}" cy="${y}" r="${i % 6 === 0 ? 1.5 : 0.8}"/>`;
    }).join("");
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const [x1, y1] = polar(118, i * 30 + 15);
      const [x2, y2] = polar(124, i * 30 + 15);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join("");
    return `
<svg class="seal__rings" viewBox="-150 -150 300 300" aria-hidden="true">
  <defs>
    <radialGradient id="sealBody" cx="42%" cy="36%" r="75%">
      <stop offset="0" stop-color="#43121a"/>
      <stop offset=".55" stop-color="#2a0910"/>
      <stop offset="1" stop-color="#170408"/>
    </radialGradient>
    <linearGradient id="sealRim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e3cc9c"/>
      <stop offset=".35" stop-color="#a88450"/>
      <stop offset=".7" stop-color="#6f5230"/>
      <stop offset="1" stop-color="#b8955f"/>
    </linearGradient>
  </defs>
  <circle r="149" fill="url(#sealBody)"/>
  <circle r="146.5" fill="none" stroke="url(#sealRim)" stroke-width="1.1" opacity=".8"/>
  <circle r="141" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".35"/>
  <g fill="${GOLD}" opacity=".45">${dots}</g>
  <circle r="128" fill="none" stroke="${GOLD}" stroke-width=".5" opacity=".35"/>
  <g stroke="${GOLD}" stroke-width=".6" opacity=".3">${ticks}</g>
  <circle r="112" fill="none" stroke="${GOLD}" stroke-width=".4" opacity=".18"/>
</svg>`;
  }

  /* ---------- Relief behind «میراث»: rosette + merlon frieze ---------- */
  function relief() {
    const frieze = (y) => Array.from({ length: 21 }, (_, i) => merlon(-500 + i * 48, y, 1)).join("");
    const art = `
  <g transform="translate(500 500)">
    <circle r="330"/><circle r="318"/>
    ${rosette(12, 120, 300, 46)}
    ${rosette(12, 150, 250, 18, 15)}
    <circle r="112"/><circle r="100"/>
    ${rosette(12, 34, 94, 16)}
    <circle r="24"/>
    ${frieze(-470)}${frieze(450)}
    <line x1="-500" y1="-476" x2="500" y2="-476"/><line x1="-500" y1="476" x2="500" y2="476"/>
  </g>`;
    return `
<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
  <g fill="none" stroke-width="2.2">
    <g stroke="#000" opacity=".9" transform="translate(2.5 3.5)">${art}</g>
    <g stroke="#e8cf9c" opacity=".7">${art}</g>
  </g>
</svg>`;
  }

  /* ---------- Door carving: one rosette split by the seam ---------- */
  function doorArt() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400"><g fill="none" stroke="${GOLD}" stroke-width="1">
      <circle r="190"/><circle r="182"/>${rosette(16, 70, 176, 22)}<circle r="64"/>${rosette(8, 14, 58, 12, 22.5)}<circle r="10"/>
    </g></svg>`;
  }

  /* ---------- Abstract engraved glyphs for the detail card ---------- */
  const glyphs = {
    // Achaemenid rosette — the day
    rosette: `<svg viewBox="-16 -16 32 32"><g fill="none" stroke="currentColor" stroke-width=".9">
      <circle r="14.5"/>${rosette(8, 3.6, 12, 3.1)}<circle r="1.8"/></g></svg>`,
    // Sun resting on the horizon — the evening hour
    dusk: `<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round">
      <path d="M8.5 20.5 A7.5 7.5 0 0 1 23.5 20.5"/><line x1="3" y1="20.5" x2="29" y2="20.5"/>
      <line x1="16" y1="6" x2="16" y2="9"/><line x1="7.2" y1="10.6" x2="9.1" y2="12.5"/><line x1="24.8" y1="10.6" x2="22.9" y2="12.5"/>
      <line x1="10" y1="24" x2="22" y2="24"/><line x1="13" y1="27" x2="19" y2="27"/></g></svg>`,
    // Persepolis stepped merlon — the place
    gate: `<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width=".9" stroke-linejoin="miter">
      <path d="M4 28 V22 H8 V16 H12 V10 H14 V4 H18 V10 H20 V16 H24 V22 H28 V28 Z"/>
      <path d="M13.5 28 V22.5 A2.5 2.5 0 0 1 18.5 22.5 V28"/></g></svg>`
  };

  /* ---------- Engraved card frame (sized at runtime) ---------- */
  function frame(w, h) {
    const i = 7, s = 10;
    const notch = (x, y, sx, sy) =>
      `<path class="draw" pathLength="1" d="M${x} ${y + sy * s} h${sx * 4} v${-sy * 4} h${sx * 4} v${-sy * 4} h${sx * 2}"/>`;
    return `
  <rect class="frame__outer draw" pathLength="1" x=".5" y=".5" width="${w - 1}" height="${h - 1}"/>
  <rect class="frame__inner draw" pathLength="1" x="${i}" y="${i}" width="${w - i * 2}" height="${h - i * 2}"/>
  <g class="frame__notches">
    ${notch(i, i, 1, 1)}${notch(w - i, i, -1, 1)}${notch(i, h - i, 1, -1)}${notch(w - i, h - i, -1, -1)}
  </g>
  <path class="frame__diamond" d="M${w / 2} ${i - 4} l4 4 l-4 4 l-4 -4 Z"/>
  <path class="frame__diamond" d="M${w / 2} ${h - i - 4} l4 4 l-4 4 l-4 -4 Z"/>`;
  }

  window.NADER_MOTIFS = { sealRings, relief, doorArt, glyphs, frame };
})();
