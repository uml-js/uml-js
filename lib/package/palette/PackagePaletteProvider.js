import { ICONS } from '../icons.js';


/**
 * Palette entries for package diagrams.
 */
export default function PackagePaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool, globalConnect) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;
  this._globalConnect = globalConnect;

  palette.registerProvider(this);
}

PackagePaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool',
  'globalConnect'
];

PackagePaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory,
        handTool = this._handTool,
        lassoTool = this._lassoTool,
        globalConnect = this._globalConnect;

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
    'global-connect-tool': {
      group: 'tools',
      title: 'Connect elements',
      imageUrl: ICONS.globalConnect,
      action: {
        click: event => globalConnect.start(event)
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    },
    'create.package': createAction('Create package', ICONS.package, { type: 'uml:Package', name: 'Package' })
  };
};
