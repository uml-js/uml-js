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

  package: customIcon('<path d="M110 160H440V300H890V890H110Z"/><path d="M110 300H440"/>'),

  // dependencies, with the keyword marker « » for imports, accesses and merges
  dependency: customIcon('<path d="M60 525H920" stroke-dasharray="100 70"/><path d="M640 345L920 525L640 705"/>'),
  keywordDependency: customIcon('<path d="M60 645H920" stroke-dasharray="100 70"/><path d="M640 465L920 645L640 825"/><path d="M420 200L360 255L420 310M490 200L430 255L490 310M510 200L570 255L510 310M580 200L640 255L580 310" stroke-width="35"/>')
};
