import { ICONS } from '../icons.js';

import { NODE_TYPES, getShapeAttrs } from '../util/NodeTypes.js';


/**
 * Palette entries for activity diagrams.
 */
export default function ActivityPaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

ActivityPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool'
];

ActivityPaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory,
        handTool = this._handTool,
        lassoTool = this._lassoTool;

  const entries = {
    'hand-tool': {
      group: 'tools',
      title: 'Activate hand tool',
      imageUrl: ICONS.hand,
      action: {
        click: event => handTool.activateHand(event)
      }
    },
    'lasso-tool': {
      group: 'tools',
      title: 'Activate lasso tool',
      imageUrl: ICONS.lasso,
      action: {
        click: event => lassoTool.activateSelection(event)
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    }
  };

  for (const nodeType of NODE_TYPES) {
    const createShape = event => create.start(event, elementFactory.createShape(getShapeAttrs(nodeType)));

    entries[`create.${ nodeType.id }`] = {
      group: nodeType.id === 'action' || nodeType.id === 'initial' || nodeType.id === 'activity-final' ? 'nodes' : 'control',
      title: `Create ${ nodeType.label.toLowerCase() }`,
      imageUrl: nodeType.icon,
      action: {
        dragstart: createShape,
        click: createShape
      }
    };
  }

  return entries;
};
