import { ICONS } from '../icons.js';


/**
 * Palette entries for use case diagrams.
 */
export default function UseCasePaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

UseCasePaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool'
];

UseCasePaletteProvider.prototype.getPaletteEntries = function() {
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
    'create.actor': createAction('Create actor', ICONS.actor, { type: 'uml:Actor', name: 'Actor' }),
    'create.use-case': createAction('Create use case', ICONS.useCase, { type: 'uml:UseCase', name: 'Use case' }),
    'create.subject': createAction('Create system boundary', ICONS.subject, { type: 'uml:Class', name: 'System' })
  };
};
