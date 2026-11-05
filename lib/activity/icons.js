import { customIcon, glyphIcon, ICON_COLOR } from '../core/icons/index.js';

/**
 * Palette, context pad and popup menu icons, as data URLs.
 *
 * Icons with a BPMN counterpart are taken from bpmn-font, UML specific ones
 * are drawn in the same style (1000 x 1000 box, centered at 500,525).
 */

const FILL = `fill="${ ICON_COLOR }" stroke="none"`;

export const ICONS = {
  hand: glyphIcon('hand-tool'),
  lasso: glyphIcon('lasso-tool'),
  connect: glyphIcon('connection'),
  replace: glyphIcon('screw-wrench'),
  remove: glyphIcon('trash'),

  action: glyphIcon('task'),
  decision: glyphIcon('gateway-none'),
  activityFinal: glyphIcon('end-event-terminate'),

  initial: customIcon(`<circle cx="500" cy="525" r="300" ${ FILL }/>`),
  flowFinal: customIcon('<circle cx="500" cy="525" r="330"/><path d="M267 292L733 758M733 292L267 758"/>'),
  forkJoin: customIcon(`<rect x="100" y="455" width="800" height="140" ${ FILL }/>`),

  // a dashed action
  structured: customIcon('<rect x="100" y="225" width="800" height="600" rx="120" stroke-dasharray="110 70"/>'),

  // an action with the rake symbol in its lower right corner
  callBehavior: customIcon('<rect x="100" y="225" width="800" height="600" rx="120"/><path d="M700 590V650M600 650H800M600 650V730M700 650V730M800 650V730"/>'),

  // pins: a square with an arrow into, or out of, the action at its right
  inputPin: customIcon('<rect x="250" y="275" width="500" height="500"/><path d="M330 525H650M560 435L650 525L560 615"/>'),
  outputPin: customIcon('<rect x="250" y="275" width="500" height="500"/><path d="M670 525H350M440 435L350 525L440 615"/>'),

  // object nodes: a rectangle with the bar of a keyword, a rectangle with stacked lines
  centralBuffer: customIcon('<rect x="100" y="275" width="800" height="500"/><path d="M300 445H700M250 605H750"/>'),
  dataStore: customIcon('<rect x="100" y="275" width="800" height="500"/><path d="M250 425H750M250 525H750M250 625H750"/>'),

  // a dashed action with an expansion node on its top
  expansion: customIcon('<rect x="100" y="275" width="800" height="550" rx="120" stroke-dasharray="110 70"/><path d="M300 200H700V350H300ZM400 200V350M500 200V350M600 200V350"/>'),

  // a box of four compartments
  expansionNode: customIcon('<path d="M100 400H900V650H100ZM300 400V650M500 400V650M700 400V650"/>'),

  // a swimlane: a rectangle with a header at its top
  partition: customIcon('<rect x="250" y="125" width="500" height="800"/><path d="M250 300H750"/>'),

  // a dashed rounded rectangle with a lightning bolt leaving it
  interruptible: customIcon('<rect x="100" y="225" width="600" height="500" rx="120" stroke-dasharray="110 70"/><path d="M550 475L780 610L700 650L930 790"/>')
};
