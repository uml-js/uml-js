import { ICONS } from '../icons.js';


/**
 * Palette entries for sequence diagrams.
 */
export default function SequencePaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool, globalConnect) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;
  this._globalConnect = globalConnect;

  palette.registerProvider(this);
}

SequencePaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool',
  'globalConnect'
];

SequencePaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory,
        handTool = this._handTool,
        lassoTool = this._lassoTool,
        globalConnect = this._globalConnect;

  function createLifeline(event) {
    create.start(event, elementFactory.createShape({ type: 'uml:Lifeline', name: 'Lifeline' }));
  }

  function createCombinedFragment(event) {
    create.start(event, elementFactory.createShape({ type: 'uml:CombinedFragment', interactionOperator: 'loop' }));
  }

  function createExecution(event) {
    create.start(event, elementFactory.createShape({ type: 'uml:BehaviorExecutionSpecification' }));
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
      title: 'Create message',
      imageUrl: ICONS.globalConnect,
      action: {
        click: event => globalConnect.start(event)
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    },
    'create.lifeline': {
      group: 'elements',
      title: 'Create lifeline',
      imageUrl: ICONS.lifeline,
      action: {
        dragstart: createLifeline,
        click: createLifeline
      }
    },
    'create.execution': {
      group: 'elements',
      title: 'Create activation (drop on a lifeline)',
      imageUrl: ICONS.execution,
      action: {
        dragstart: createExecution,
        click: createExecution
      }
    },
    'create.combined-fragment': {
      group: 'elements',
      title: 'Create combined fragment (loop, alt, opt, ...)',
      imageUrl: ICONS.combinedFragment,
      action: {
        dragstart: createCombinedFragment,
        click: createCombinedFragment
      }
    }
  };
};
