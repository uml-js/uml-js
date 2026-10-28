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

// a state with the composite icon in its lower right corner, for submachine and collapsed states
const STATE_WITH_COMPOSITE_ICON = customIcon('<rect x="100" y="225" width="800" height="600" rx="120"/><rect x="560" y="640" width="90" height="70" rx="25" stroke-width="40"/><rect x="730" y="640" width="90" height="70" rx="25" stroke-width="40"/><path d="M650 675H730" stroke-width="40"/>');

export const ICONS = {
  hand: glyphIcon('hand-tool'),
  lasso: glyphIcon('lasso-tool'),
  globalConnect: glyphIcon('connection-multi'),
  connect: glyphIcon('connection'),
  replace: glyphIcon('screw-wrench'),
  remove: glyphIcon('trash'),

  state: glyphIcon('task'),
  final: glyphIcon('end-event-terminate'),
  choice: glyphIcon('gateway-none'),

  initial: customIcon(`<circle cx="500" cy="525" r="300" ${ FILL }/>`),
  junction: customIcon(`<circle cx="500" cy="525" r="170" ${ FILL }/>`),
  forkJoin: customIcon(`<rect x="430" y="100" width="140" height="850" ${ FILL }/>`),
  shallowHistory: customIcon(`${ RING }${ H }`),
  deepHistory: customIcon(`${ RING }<g transform="translate(-60 0)">${ H }</g><path d="M680 300v170M610 340l140 90M750 340l-140 90" stroke-width="45"/>`),
  terminate: customIcon('<path d="M170 195L830 855M830 195L170 855" stroke-width="110"/>'),

  // a state with a state inside
  compositeState: customIcon('<rect x="85" y="158" width="830" height="734" rx="130"/><path d="M85 360H915"/><rect x="300" y="500" width="400" height="260" rx="70"/>'),
  // a state with a separator line and lines of text below
  internalActivities: customIcon('<rect x="85" y="158" width="830" height="734" rx="130"/><path d="M85 390H915M220 540H700M220 700H600"/>'),
  submachineState: STATE_WITH_COMPOSITE_ICON,
  collapsedState: STATE_WITH_COMPOSITE_ICON
};
