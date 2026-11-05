import { getQualifierData } from './CompartmentUtil.js';

import { getQualifierBox } from './EndLabelUtil.js';

import { formatQualifiers } from './MemberUtil.js';


/**
 * @param {ModdleElement} end an association end
 *
 * @return {string} the text of the qualifier box of the end, empty without qualifiers
 */
export function getQualifierText(end) {
  return formatQualifiers(getQualifierData(end));
}

/**
 * @param {ModdleElement} end an association end
 * @param {Point[]} waypoints of the association
 * @param {number} index 0 for the source end, 1 for the target end
 * @param {TextRenderer} textRenderer
 *
 * @return {Object|null} the qualifier box of the end (see EndLabelUtil#getQualifierBox), if it has qualifiers
 */
export function getEndQualifierBox(end, waypoints, index, textRenderer) {
  const text = end && getQualifierText(end);

  return text ? getQualifierBox(waypoints, index, textRenderer.getTextWidth(text)) : null;
}

/**
 * @return {number} how far the qualifier box of an end extends along the line, 0 without qualifiers
 */
export function getQualifierExtent(end, waypoints, index, textRenderer) {
  const box = getEndQualifierBox(end, waypoints, index, textRenderer);

  return box ? box.extent : 0;
}
