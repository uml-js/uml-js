/**
 * Keyboard shortcuts in addition to the diagram-js defaults
 * (undo, redo, delete, zoom, ...), like in bpmn-js:
 *
 *   * H: hand tool
 *   * L: lasso tool
 *   * S: space tool
 *   * C: global connect tool
 *   * E: edit label of the selected element
 *   * R: change the type of the selected element (replace menu)
 */
export default function UmlKeyboardBindings(
    keyboard, handTool, lassoTool, spaceTool, globalConnect,
    selection, directEditing, replaceMenu) {

  function getSelected() {
    const selected = selection.get();

    return selected.length === 1 ? selected[0] : null;
  }

  const actions = {
    h: () => handTool.activateHand(),
    l: () => lassoTool.activateSelection(),
    s: () => spaceTool.activateSelection(),
    c: () => globalConnect.start(),
    r: () => {
      const element = getSelected();

      if (element) {
        replaceMenu.open(element);
      }
    },
    e: () => {
      const element = getSelected();

      if (element) {
        directEditing.activate(element);
      }
    }
  };

  keyboard.addListener(function(context) {
    const event = context.keyEvent;

    if (keyboard.hasModifier(event)) {
      return;
    }

    const action = actions[event.key.toLowerCase()];

    if (action) {
      action();

      return true;
    }
  });
}

UmlKeyboardBindings.$inject = [
  'keyboard',
  'handTool',
  'lassoTool',
  'spaceTool',
  'globalConnect',
  'selection',
  'directEditing',
  'replaceMenu'
];
