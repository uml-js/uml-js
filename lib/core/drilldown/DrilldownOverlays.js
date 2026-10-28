import { domify } from 'min-dom';

const OVERLAY_TYPE = 'uml-drilldown';

const ICON = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2L10 10M10 4.5V10H4.5"/></svg>';

// blue, as a link to another diagram
const LINK_COLOR = 'hsl(205, 100%, 40%)';

const BUTTON_STYLE = [
  'display: flex',
  'align-items: center',
  'justify-content: center',
  'width: 20px',
  'height: 20px',
  'padding: 0',
  `border: 1px solid ${ LINK_COLOR }`,
  'border-radius: 2px',
  'background: #fff',
  `color: ${ LINK_COLOR }`,
  'cursor: pointer'
].join(';');


/**
 * Drill-down buttons on elements whose details are shown in a diagram of their
 * own, as bpmn-js shows them on collapsed subprocesses, e.g. on call behavior
 * actions calling an activity.
 *
 * Diagram types register providers telling the model element to show for an
 * element. A click fires `drilldown.open` with element and model element, upon
 * which the manager of all diagrams (see lib/uml.js) shows a diagram of the
 * model element, creating an empty one if there is none.
 *
 * Buttons are only shown while their element is hovered or selected.
 *
 * @example
 *
 * drilldownOverlays.registerProvider({
 *   getDrilldownTarget: element => is(element, 'uml:CallBehaviorAction') ? element.businessObject.behavior : null
 * });
 */
export default function DrilldownOverlays(eventBus, overlays) {
  this._eventBus = eventBus;
  this._overlays = overlays;
  this._providers = [];

  // the buttons, by element
  this._buttons = new Map();

  this._hovered = null;
  this._selected = [];

  eventBus.on([ 'shape.added', 'element.changed' ], ({ element }) => this._update(element));

  eventBus.on('element.hover', ({ element }) => {
    this._hovered = element;
    this._updateVisibility();
  });

  eventBus.on('element.out', () => {
    this._hovered = null;
    this._updateVisibility();
  });

  eventBus.on('selection.changed', ({ newSelection }) => {
    this._selected = newSelection;
    this._updateVisibility();
  });
}

DrilldownOverlays.$inject = [
  'eventBus',
  'overlays'
];

/**
 * @param { { getDrilldownTarget: (element: Element) => ModdleElement|null } } provider
 */
DrilldownOverlays.prototype.registerProvider = function(provider) {
  this._providers.push(provider);
};

/**
 * @param {Element} element
 *
 * @return {ModdleElement|null} the model element to show a diagram of
 */
DrilldownOverlays.prototype.getDrilldownTarget = function(element) {
  for (const provider of this._providers) {
    const target = provider.getDrilldownTarget(element);

    if (target) {
      return target;
    }
  }

  return null;
};

DrilldownOverlays.prototype._update = function(element) {
  const overlays = this._overlays;

  overlays.remove({ element, type: OVERLAY_TYPE });

  this._buttons.delete(element);

  // removed elements are reported as changed, too
  if (!element.parent || element.waypoints) {
    return;
  }

  const target = this.getDrilldownTarget(element);

  if (!target) {
    return;
  }

  const button = domify(`<button type="button" class="uml-drilldown" title="Open ${ escape(target.name || 'diagram') }" style="${ BUTTON_STYLE }">${ ICON }</button>`);

  button.addEventListener('click', () => {
    this._eventBus.fire('drilldown.open', { element, target });
  });

  // moving to the button leaves the element, which keeps it shown
  button.addEventListener('mouseenter', () => {
    this._hovered = element;
    this._updateVisibility();
  });

  this._buttons.set(element, button);

  this._updateVisibility();

  overlays.add(element, OVERLAY_TYPE, {
    // on the lower boundary, centered
    position: { bottom: 10, left: element.width / 2 - 10 },
    html: button
  });
};

DrilldownOverlays.prototype._updateVisibility = function() {
  for (const [ element, button ] of this._buttons) {
    const shown = element === this._hovered || this._selected.includes(element);

    button.style.visibility = shown ? 'visible' : 'hidden';
  }
};


function escape(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
