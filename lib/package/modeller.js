import BaseModeler from '../core/BaseModeler.js';

import AutoScrollModule from 'diagram-js/lib/features/auto-scroll/index.js';
import BendpointsModule from 'diagram-js/lib/features/bendpoints/index.js';
import ConnectionPreviewModule from 'diagram-js/lib/features/connection-preview/index.js';
import GridSnappingModule from 'diagram-js/lib/features/grid-snapping/index.js';
import KeyboardMoveSelectionModule from 'diagram-js/lib/features/keyboard-move-selection/index.js';
import MoveModule from 'diagram-js/lib/features/move/index.js';
import OutlineModule from 'diagram-js/lib/features/outline/index.js';
import ResizeModule from 'diagram-js/lib/features/resize/index.js';
import SnappingModule from 'diagram-js/lib/features/snapping/index.js';

import PackageViewer from './viewer.js';

import ContextPadModule from './context-pad/index.js';
import LabelEditingModule from './label-editing/index.js';
import ModelingModule from './modeling/index.js';
import PaletteModule from './palette/index.js';
import PopupMenuModule from './popup-menu/index.js';
import RulesModule from './rules/index.js';


/**
 * A modeler for UML package diagrams (`umldi:UMLPackageDiagram`).
 */
export default class PackageModeler extends BaseModeler {

  static modules = [
    ...BaseModeler.modules,
    ...PackageViewer.modules.filter(module => !BaseModeler.modules.includes(module)),
    AutoScrollModule,
    BendpointsModule,
    ConnectionPreviewModule,
    GridSnappingModule,
    KeyboardMoveSelectionModule,
    MoveModule,
    OutlineModule,
    ResizeModule,
    SnappingModule,
    ModelingModule,
    RulesModule,
    ContextPadModule,
    PaletteModule,
    PopupMenuModule,
    LabelEditingModule
  ];
}
