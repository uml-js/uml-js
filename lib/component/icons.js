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

  component: customIcon(`
    <rect x="85" y="158" width="830" height="734"/>
    <rect x="610" y="270" width="180" height="230" stroke-width="40"/>
    <rect x="560" y="310" width="100" height="45" ${ FILL }/>
    <rect x="560" y="415" width="100" height="45" ${ FILL }/>
  `),
  interface: customIcon(`
    <rect x="85" y="158" width="830" height="734"/>
    <path d="M300 440H700M300 600H700" stroke-width="40"/>
  `),
  ball: customIcon('<path d="M60 525H520"/><circle cx="720" cy="525" r="200"/>'),
  providedInterface: customIcon('<path d="M60 525H480"/><circle cx="700" cy="525" r="200" stroke-width="70"/>'),
  requiredInterface: customIcon('<path d="M60 525H480"/><path d="M780 245A280 280 0 0 0 780 805" stroke-width="70"/>'),
  port: customIcon('<rect x="290" y="315" width="420" height="420"/>')
};
