import { FOLD, isNote } from './CommentUtil.js';


/**
 * Direct editing of the text of notes, in all diagram types: on double-click
 * and once created. Completion of direct editing is up to the label editing
 * provider of the diagram type.
 */
export default function CommentLabelEditingProvider(eventBus, canvas, directEditing, modeling, textRenderer) {
  this._canvas = canvas;
  this._modeling = modeling;
  this._textRenderer = textRenderer;

  directEditing.registerProvider(this);

  function activate(element) {
    if (isNote(element)) {
      directEditing.activate(element);
    }
  }

  eventBus.on('element.dblclick', function(event) {
    activate(event.element);
  });

  eventBus.on([ 'create.end', 'autoPlace.end' ], 500, function(event) {
    const shape = event.shape || (event.context && event.context.shape);

    if (event.isTouch || (event.context && !event.context.canExecute)) {
      return;
    }

    // not when pasted, as in bpmn-js
    if (event.context && event.context.hints && event.context.hints.createElementsBehavior === false) {
      return;
    }

    activate(shape);
  });
}

CommentLabelEditingProvider.$inject = [
  'eventBus',
  'canvas',
  'directEditing',
  'modeling',
  'textRenderer'
];

CommentLabelEditingProvider.prototype.activate = function(element) {
  if (!isNote(element)) {
    return;
  }

  const viewbox = this._canvas.viewbox();
  const scale = viewbox.scale;
  const style = this._textRenderer.getDefaultStyle();

  return {
    text: element.businessObject.body || '',
    bounds: {
      x: (element.x - viewbox.x) * scale,
      y: (element.y - viewbox.y) * scale,
      width: (element.width - FOLD) * scale,
      height: element.height * scale
    },
    style: {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize * scale + 'px',
      lineHeight: style.lineHeight,
      textAlign: 'left',
      paddingTop: 6 * scale + 'px',
      paddingBottom: 6 * scale + 'px',
      paddingLeft: 8 * scale + 'px',
      paddingRight: 2 * scale + 'px'
    },
    options: {
      resizable: false,
      autoResize: false
    }
  };
};

CommentLabelEditingProvider.prototype.update = function(element, newText) {
  this._modeling.updateProperties(element, { body: newText.trim() || undefined });
};
