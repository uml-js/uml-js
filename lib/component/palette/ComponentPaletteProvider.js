import { ICONS } from '../icons.js';


/**
 * Palette entries for component diagrams.
 */
export default function ComponentPaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

ComponentPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool'
];

ComponentPaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory,
        handTool = this._handTool,
        lassoTool = this._lassoTool;

  function createAction(title, imageUrl, attrs) {

    function createShape(event) {
      create.start(event, elementFactory.createShape(attrs));
    }

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
    'create.component': createAction('Create component', ICONS.component, { type: 'uml:Component', name: 'Component' }),
    'create.interface': createAction('Create interface', ICONS.interface, { type: 'uml:Interface', name: 'Interface' }),
    'create.port': createAction('Create port (drop on a component border)', ICONS.port, { type: 'uml:Port' })
  };
};
