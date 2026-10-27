import { is, isLabel } from '../../core/util/ModelUtil.js';

export const TAB_HEIGHT = 20;

const TAB_PADDING = 8;
const MIN_TAB_WIDTH = 40;


export function isPackage(element) {
  return is(element, 'uml:Package') && !isLabel(element) && !(element && element.waypoints);
}

/**
 * @param {Shape} element
 *
 * @return {boolean} whether the package shows contents, then its name is shown in the tab
 */
export function showsContents(element) {
  return (element.children || []).some(child => !isLabel(child) && !child.waypoints);
}

/**
 * @param {Shape} element a package
 * @param {TextRenderer} textRenderer
 *
 * @return {number} the width of the tab: fitting the name, if shown in it
 */
export function getTabWidth(element, textRenderer) {
  const maxWidth = Math.max(MIN_TAB_WIDTH, element.width - TAB_PADDING);

  if (!showsContents(element)) {
    return Math.min(maxWidth, Math.max(MIN_TAB_WIDTH, element.width * 0.4));
  }

  const nameWidth = textRenderer.getTextWidth(element.businessObject.name || '', { fontWeight: 'bold' });

  return Math.min(maxWidth, Math.max(MIN_TAB_WIDTH, nameWidth + 2 * TAB_PADDING));
}

/**
 * The kind of a relationship between packages, as shown by its keyword.
 *
 * @param {ModdleElement} bo
 *
 * @return {'dependency'|'import'|'access'|'merge'}
 */
export function getRelationshipKind(bo) {
  if (is(bo, 'uml:PackageImport')) {
    return bo.visibility === 'private' ? 'access' : 'import';
  }

  if (is(bo, 'uml:PackageMerge')) {
    return 'merge';
  }

  return 'dependency';
}
