import { customIcon, glyphIcon } from '../core/icons/index.js';

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

  actor: customIcon('<circle cx="500" cy="230" r="120"/><path d="M500 350V680M260 470H740M500 680L320 960M500 680L680 960"/>'),
  useCase: customIcon('<ellipse cx="500" cy="525" rx="430" ry="260"/>'),
  subject: customIcon('<rect x="85" y="110" width="830" height="830"/><path d="M300 270H700" stroke-width="40"/>'),
  include: customIcon('<path d="M60 525H920" stroke-dasharray="100 70"/><path d="M640 345L920 525L640 705"/>'),
  generalization: customIcon('<path d="M60 525H640"/><path d="M640 345L920 525L640 705Z" fill="#fff"/>')
};
