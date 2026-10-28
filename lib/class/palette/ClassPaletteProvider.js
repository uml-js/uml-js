import { ICONS } from '../icons.js';


/**
 * Palette entries for class diagrams. Interfaces, enumerations and
 * abstract classes are classes changed via the wrench.
 */
export default function ClassPaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

ClassPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool'
];

ClassPaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory,
        handTool = this._handTool,
        lassoTool = this._lassoTool;

  function createAction(title, imageUrl, attrs) {
    const createShape = event => create.start(event, elementFactory.createShape(attrs));

    return {
      group: 'elements',
      title,
      imageUrl,
      action: {
        dragstart: createShape,
        click: createShape
      }
    };
  }

  return {
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
    },
    'create.class': createAction('Create class', ICONS.class, { type: 'uml:Class', name: 'Class' })
  };
};
