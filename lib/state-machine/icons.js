import { customIcon, glyphIcon, ICON_COLOR } from '../core/icons/index.js';

/**
 * Palette, context pad and popup menu icons, as data URLs.
 *
 * Icons with a BPMN counterpart are taken from bpmn-font, UML specific ones
 * are drawn in the same style (1000 x 1000 box, centered at 500,525).
 */

const FILL = `fill="${ ICON_COLOR }" stroke="none"`;

const RING = '<circle cx="500" cy="525" r="450"/>';

const H = '<path d="M370 330v390M370 525h200M570 330v390" stroke-width="70"/>';

export const ICONS = {
  hand: glyphIcon('hand-tool'),
  lasso: glyphIcon('lasso-tool'),
  globalConnect: glyphIcon('connection-multi'),
  connect: glyphIcon('connection'),
  replace: glyphIcon('screw-wrench'),
  remove: glyphIcon('trash'),

  state: glyphIcon('task'),
  compositeState: customIcon('<rect x="85" y="158" width="830" height="734" rx="130"/><path d="M85 390H915"/>'),
  final: glyphIcon('end-event-terminate'),
  choice: glyphIcon('gateway-none'),

  initial: customIcon(`<circle cx="500" cy="525" r="300" ${ FILL }/>`),
  junction: customIcon(`<circle cx="500" cy="525" r="170" ${ FILL }/>`),
  forkJoin: customIcon(`<rect x="430" y="100" width="140" height="850" ${ FILL }/>`),
  shallowHistory: customIcon(`${ RING }${ H }`),
  deepHistory: customIcon(`${ RING }<g transform="translate(-60 0)">${ H }</g><path d="M680 300v170M610 340l140 90M750 340l-140 90" stroke-width="45"/>`),
  terminate: customIcon('<path d="M170 195L830 855M830 195L170 855" stroke-width="110"/>')
};
