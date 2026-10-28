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

  combinedFragment: customIcon(`<rect x="85" y="158" width="830" height="734"/><path d="M85 400H360L430 330V158"/><path d="M85 650H915" stroke-dasharray="80 60"/>`),
  operand: customIcon(`<rect x="85" y="158" width="830" height="734"/><path d="M85 525H915" stroke-dasharray="80 60" stroke-width="70"/>`),
  execution: customIcon('<path d="M500 60V200M500 860V990" stroke-dasharray="80 60"/><rect x="400" y="200" width="200" height="660" fill="#fff"/>'),
  lifeline: customIcon('<rect x="250" y="80" width="500" height="250"/><path d="M500 330V970" stroke-dasharray="80 60"/>'),
  synchCall: customIcon(`<path d="M60 525H700"/><path d="M640 345L940 525L640 705Z" ${ FILL }/>`),
  asynchCall: customIcon('<path d="M60 525H920M640 345L920 525L640 705"/>'),
  reply: customIcon(`<path d="M60 525H700" stroke-dasharray="100 70"/><path d="M640 345L940 525L640 705Z" ${ FILL }/>`)
};
