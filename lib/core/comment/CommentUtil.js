import { isComment, isLabel } from '../util/ModelUtil.js';

export const FOLD = 12;

/**
 * Padding of the text of a note within its box, clear of the folded corner.
 */
export const NOTE_PADDING = { top: 6, right: FOLD + 2, bottom: 6, left: 8 };


/**
 * @return {boolean} whether the element is a note, drawn for a comment
 */
export function isNote(element) {
  return isComment(element) && !isLabel(element) && !(element && element.waypoints);
}

/**
 * @return {boolean} whether the element is the line connecting a note to an annotated element
 */
export function isAnchor(element) {
  return isComment(element) && !!(element && element.waypoints);
}

/**
 * @param {Connection} anchor
 *
 * @return {Element} the annotated end of the line, the one which is not the note
 */
export function getAnnotated(anchor) {
  return isNote(anchor.source) ? anchor.target : anchor.source;
}

/**
 * @param {Connection} anchor
 *
 * @return {Shape} the note end of the line
 */
export function getNote(anchor) {
  return isNote(anchor.source) ? anchor.source : anchor.target;
}
