import BPMN_FONT_GLYPHS from './bpmn-font.js';

export const ICON_COLOR = '#22242a';

/**
 * Line width of bpmn-font outlines, used for custom icons, too.
 */
export const ICON_STROKE_WIDTH = 48;


/**
 * @param {string} content SVG content in a 1000 x 1000 box (y axis pointing down)
 *
 * @return {string} data URL
 */
export function toDataUrl(content) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1000 1000">${ content }</svg>`;

  return `data:image/svg+xml;charset=utf-8,${ encodeURIComponent(svg) }`;
}

/**
 * An icon from bpmn-font.
 *
 * @param {string} name glyph name, e.g. `screw-wrench`
 *
 * @return {string} data URL
 */
export function glyphIcon(name) {
  const d = BPMN_FONT_GLYPHS[name];

  if (!d) {
    throw new Error(`unknown glyph <${ name }>`);
  }

  // glyphs use font coordinates: baseline at 850, y axis pointing up
  return toDataUrl(`<path transform="translate(0 850) scale(1 -1)" fill="${ ICON_COLOR }" d="${ d }"/>`);
}

/**
 * An icon drawn in the style of bpmn-font, for symbols bpmn-font does not provide.
 *
 * @param {string} content SVG content in a 1000 x 1000 box (y axis pointing down)
 *
 * @return {string} data URL
 */
export function customIcon(content) {
  return toDataUrl(`<g fill="none" stroke="${ ICON_COLOR }" stroke-width="${ ICON_STROKE_WIDTH }">${ content }</g>`);
}
