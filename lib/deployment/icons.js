import { customIcon, glyphIcon } from '../core/icons/index.js';

const NODE = '<path d="M110 260L260 110H890V740L740 890H110Z"/><path d="M110 260H740V890M740 260L890 110"/>';

const KEYWORD = '<path d="M310 445L260 500L310 555M370 445L320 500L370 555M430 445L480 500L430 555M490 445L540 500L490 555" stroke-width="35"/>';

/**
 * Palette, context pad and popup menu icons, as data URLs.
 *
 * Icons with a BPMN counterpart are taken from bpmn-font, UML specific ones
 * are drawn in the same style (1000 x 1000 box, centered at 500,525).
 */
export const ICONS = {
  hand: glyphIcon('hand-tool'),
  lasso: glyphIcon('lasso-tool'),
  connect: glyphIcon('connection'),
  replace: glyphIcon('screw-wrench'),
  remove: glyphIcon('trash'),

  // nodes, devices and execution environments with a keyword marker « »
  node: customIcon(NODE),
  keywordNode: customIcon(NODE + KEYWORD),

  artifact: customIcon('<rect x="110" y="210" width="780" height="630"/><path d="M640 300h120l60 60v180h-180zM760 300v60h60" stroke-width="35"/>'),

  dependency: customIcon('<path d="M60 525H920" stroke-dasharray="100 70"/><path d="M640 345L920 525L640 705"/>'),
  deployment: customIcon('<path d="M60 645H920" stroke-dasharray="100 70"/><path d="M640 465L920 645L640 825"/><path d="M420 200L360 255L420 310M490 200L430 255L490 310M510 200L570 255L510 310M580 200L640 255L580 310" stroke-width="35"/>')
};
