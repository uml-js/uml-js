import { customIcon } from '../icons/index.js';

export const NOTE_ICON = customIcon('<path d="M210 110H630L790 270V940H210Z"/><path d="M630 110V270H790"/>');


const LOW_PRIORITY = 500;


/**
 * The palette entry to create notes, in all diagram types.
 */
export default function CommentPaletteProvider(palette, create, elementFactory) {
  this._create = create;
  this._elementFactory = elementFactory;

  // after the entries of the diagram type
  palette.registerProvider(LOW_PRIORITY, this);
}

CommentPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory'
];

CommentPaletteProvider.prototype.getPaletteEntries = function() {
  const create = this._create,
        elementFactory = this._elementFactory;

  const createNote = event => create.start(event, elementFactory.createShape({ type: 'uml:Comment' }));

  return {
    'create.note': {
      group: 'comments',
      title: 'Create note',
      imageUrl: NOTE_ICON,
      action: {
        dragstart: createNote,
        click: createNote
      }
    }
  };
};
