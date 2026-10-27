import { customIcon, glyphIcon, ICON_COLOR } from '../core/icons/index.js';

const FILL = `fill="${ ICON_COLOR }" stroke="none"`;

const CLASS_BOX = '<rect x="135" y="110" width="730" height="830"/><path d="M135 360H865M135 650H865"/>';

const CLASS = customIcon(CLASS_BOX);

const KEYWORD_CLASS = customIcon(CLASS_BOX + '<path d="M420 180L360 235L420 290M490 180L430 235L490 290M510 180L570 235L510 290M580 180L640 235L580 290" stroke-width="35"/>');

/**
 * Palette, context pad and popup menu icons, as data URLs.
 *
 * Icons with a BPMN counterpart are taken from bpmn-font, UML specific ones
 * are drawn in the same style (1000 x 1000 box, centered at 500,525).
 */
export const ICONS = {
  hand: glyphIcon('hand-tool'),
  lasso: glyphIcon('lasso-tool'),
  globalConnect: glyphIcon('connection-multi'),
  connect: glyphIcon('connection'),
  replace: glyphIcon('screw-wrench'),
  remove: glyphIcon('trash'),

  // classes and abstract classes alike, interfaces and enumerations with a keyword marker « »
  class: CLASS,
  abstractClass: CLASS,
  interface: KEYWORD_CLASS,
  enumeration: KEYWORD_CLASS,

  association: customIcon('<path d="M60 525H940"/>'),
  aggregation: customIcon(`<path d="M380 525H940"/><path d="M60 525L220 425L380 525L220 625Z" fill="#fff"/>`),
  composition: customIcon(`<path d="M380 525H940"/><path d="M60 525L220 425L380 525L220 625Z" ${ FILL }/>`),
  generalization: customIcon('<path d="M60 525H640"/><path d="M640 345L920 525L640 705Z" fill="#fff"/>'),
  realization: customIcon('<path d="M60 525H640" stroke-dasharray="100 70"/><path d="M640 345L920 525L640 705Z" fill="#fff"/>'),
  dependency: customIcon('<path d="M60 525H920" stroke-dasharray="100 70"/><path d="M640 345L920 525L640 705"/>')
};
