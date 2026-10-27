import { customIcon, ICON_COLOR } from '../icons/index.js';

const FILL = `fill="${ ICON_COLOR }" stroke="none"`;

const HORIZONTAL_BAR = customIcon(`<rect x="100" y="455" width="800" height="140" ${ FILL }/>`);
const VERTICAL_BAR = customIcon(`<rect x="430" y="100" width="140" height="850" ${ FILL }/>`);


/**
 * Replace menu entry rotating a bar (fork / join) by 90 degrees,
 * showing the resulting orientation.
 *
 * @param {Shape} element
 * @param {Modeling} modeling
 *
 * @return {Object} the entry
 */
export function getRotateEntry(element, modeling) {
  const horizontal = element.width >= element.height;

  return {
    label: horizontal ? 'Rotate (vertical)' : 'Rotate (horizontal)',
    imageUrl: horizontal ? VERTICAL_BAR : HORIZONTAL_BAR,
    action: () => modeling.rotateShape(element)
  };
}
