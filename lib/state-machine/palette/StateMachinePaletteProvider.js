import { ICONS } from '../icons.js';

import { getShapeAttrs, VERTEX_TYPES } from '../util/VertexTypes.js';


/**
 * Palette entries for state machine diagrams.
 */
export default function StateMachinePaletteProvider(
    palette, create, elementFactory,
    handTool, lassoTool) {

  this._create = create;
  this._elementFactory = elementFactory;
  this._handTool = handTool;
  this._lassoTool = lassoTool;

  palette.registerProvider(this);
}

StateMachinePaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'handTool',
  'lassoTool'
];

function getVertexTypes(ids) {
  return ids.map(id => VERTEX_TYPES.find(vertexType => vertexType.id === id));
}

StateMachinePaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory,
        handTool = this._handTool,
        lassoTool = this._lassoTool;

  function createEntries(group, vertexTypes) {
    return Object.fromEntries(vertexTypes.map(vertexType => [
      `create.${ vertexType.id }`,
      createAction(group, `Create ${ vertexType.label.toLowerCase() }`, vertexType.icon, getShapeAttrs(vertexType))
    ]));
  }

  function createAction(group, title, imageUrl, attrs) {

    function createShape(event) {
      create.start(event, elementFactory.createShape(attrs));
    }

    return {
      group,
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
    ...createEntries('states', getVertexTypes([ 'initial', 'state', 'final-state' ])),
    'states-separator': {
      group: 'states',
      separator: true
    },
    ...createEntries('pseudostates', getVertexTypes([ 'choice', 'junction', 'fork-join', 'shallow-history' ])),
    'pseudostates-separator': {
      group: 'pseudostates',
      separator: true
    },

    // on the border of composite states, or anywhere in the diagram, of the state machine
    ...createEntries('connection-points', getVertexTypes([ 'entry-point', 'exit-point' ]))
  };
};
