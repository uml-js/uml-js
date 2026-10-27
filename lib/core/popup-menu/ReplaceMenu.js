/**
 * ID of the popup menu provider to change the type of elements,
 * registered by each diagram type.
 */
export const REPLACE_MENU_ID = 'uml-replace';

const MENU_Y_OFFSET = 5;


/**
 * Opens the replace menu (wrench) for an element, below its context pad,
 * as bpmn-js does (https://github.com/bpmn-io/bpmn-js).
 */
export default function ReplaceMenu(popupMenu, contextPad, canvas) {
  this._popupMenu = popupMenu;
  this._contextPad = contextPad;
  this._canvas = canvas;
}

ReplaceMenu.$inject = [
  'popupMenu',
  'contextPad',
  'canvas'
];

/**
 * @param {Element} element
 *
 * @return {boolean}
 */
ReplaceMenu.prototype.isAvailable = function(element) {
  return !this._popupMenu.isEmpty(element, REPLACE_MENU_ID);
};

/**
 * @param {Element} element
 */
ReplaceMenu.prototype.open = function(element) {
  if (!this.isAvailable(element)) {
    return;
  }

  this._popupMenu.open(element, REPLACE_MENU_ID, this._getPosition(element), {
    title: 'Change element',
    width: 300,
    search: true
  });
};

/**
 * Below the context pad if it is open for the element, below the element otherwise.
 *
 * @param {Element} element
 *
 * @return {Point} in client coordinates
 */
ReplaceMenu.prototype._getPosition = function(element) {
  const container = this._canvas.getContainer();

  const pad = this._contextPad.isOpen(element) && container.querySelector('.djs-context-pad.open');

  if (pad) {
    const padRect = pad.getBoundingClientRect();

    return {
      x: padRect.left,
      y: padRect.bottom + MENU_Y_OFFSET
    };
  }

  const containerRect = container.getBoundingClientRect();
  const bbox = this._canvas.getAbsoluteBBox(element);

  return {
    x: containerRect.left + bbox.x,
    y: containerRect.top + bbox.y + bbox.height + MENU_Y_OFFSET
  };
};
