import { glyphIcon } from '../icons/index.js';

const SPACE_ICON = glyphIcon('space-tool');


/**
 * The palette entry of the space tool, after the lasso tool, as in bpmn-js:
 * dragging makes space, moving the elements on one side and resizing the
 * ones across, or removes it.
 */
export default function SpaceToolPaletteProvider(palette, spaceTool) {
  this._spaceTool = spaceTool;

  // after the providers of the diagram types, which add the other tools
  palette.registerProvider(500, this);
}

SpaceToolPaletteProvider.$inject = [
  'palette',
  'spaceTool'
];

SpaceToolPaletteProvider.prototype.getPaletteEntries = function() {
  const spaceTool = this._spaceTool;

  const entry = {
    group: 'tools',
    title: 'Activate create/remove space tool',
    imageUrl: SPACE_ICON,
    action: {
      click: event => spaceTool.activateSelection(event)
    }
  };

  return function(entries) {
    const updated = {};

    for (const [ id, existing ] of Object.entries(entries)) {
      updated[id] = existing;

      if (id === 'lasso-tool') {
        updated['space-tool'] = entry;
      }
    }

    return updated;
  };
};
