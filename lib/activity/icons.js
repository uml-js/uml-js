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
  globalConnect: glyphIcon('connection-multi'),
  connect: glyphIcon('connection'),
  replace: glyphIcon('screw-wrench'),
  remove: glyphIcon('trash'),

  action: glyphIcon('task'),
  decision: glyphIcon('gateway-none'),
  activityFinal: glyphIcon('end-event-terminate'),

  initial: customIcon(`<circle cx="500" cy="525" r="300" ${ FILL }/>`),
  flowFinal: customIcon('<circle cx="500" cy="525" r="330"/><path d="M267 292L733 758M733 292L267 758"/>'),
  forkJoin: customIcon(`<rect x="100" y="455" width="800" height="140" ${ FILL }/>`)
};
