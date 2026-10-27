import { glyphIcon } from '../icons/index.js';

import { isConnection, isLabel } from '../util/ModelUtil.js';

import { isAnchor, isNote } from './CommentUtil.js';

import { NOTE_ICON } from './CommentPaletteProvider.js';


const LOW_PRIORITY = 500;


/**
 * Context pad entries for notes, in all diagram types:
 *
 *   * append a note to any shape (like text annotations in bpmn-js)
 *   * connect and delete notes, delete the lines of notes
 */
export default function CommentContextPadProvider(
    contextPad, modeling, elementFactory, connect, create, autoPlace) {

  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._autoPlace = autoPlace;

  // after the entries of the diagram type
  contextPad.registerProvider(LOW_PRIORITY, this);
}

CommentContextPadProvider.$inject = [
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'autoPlace'
];

CommentContextPadProvider.prototype.getContextPadEntries = function(element) {
  const modeling = this._modeling,
        elementFactory = this._elementFactory,
        connect = this._connect,
        create = this._create,
        autoPlace = this._autoPlace;

  const entries = {};

  if (isLabel(element) || !element.parent) {
    return entries;
  }

  const remove = {
    group: 'edit',
    title: 'Delete',
    imageUrl: glyphIcon('trash'),
    action: {
      click: (event, element) => modeling.removeElements([ element ])
    }
  };

  if (isAnchor(element)) {
    entries['delete'] = remove;

    return entries;
  }

  if (isNote(element)) {
    entries['connect'] = {
      group: 'connect',
      title: 'Connect to annotated element',
      imageUrl: glyphIcon('connection'),
      action: {
        click: (event, element) => connect.start(event, element),
        dragstart: (event, element) => connect.start(event, element)
      }
    };

    entries['delete'] = remove;

    return entries;
  }

  if (!isConnection(element)) {
    const createNote = () => elementFactory.createShape({ type: 'uml:Comment' });

    // with the append entries of the diagram type, like text annotations in bpmn-js
    entries['append.note'] = {
      group: 'model',
      title: 'Add note',
      imageUrl: NOTE_ICON,
      action: {
        dragstart: (event, element) => create.start(event, createNote(), { source: element }),
        click: (event, element) => autoPlace.append(element, createNote())
      }
    };
  }

  return entries;
};
