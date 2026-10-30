import { isArray } from 'min-dash';

import { is, isLabel } from '../util/ModelUtil.js';

const LOW_PRIORITY = 750;

// pasted elements and the model and DI elements copied for them, kept with the paste
const COPIES_KEY = '-uml-js-copies';

// references kept by the updaters of the diagram types, dropped unless to pasted elements,
// e.g. the events of messages and what fragments cover in sequence diagrams
const UPDATED_REFERENCES = [
  'covered',
  'coveredBy',
  'execution',
  'finish',
  'message',
  'receiveEvent',
  'sendEvent',
  'start'
];


/**
 * Copies and pastes UML model elements along with the diagram elements showing them,
 * as bpmn-js does with BPMN elements (BpmnCopyPaste and ModdleCopy,
 * https://github.com/bpmn-io/bpmn-js): pasted shapes and connections get copies of
 * their model element and DI, with new IDs, and their labels copies of their DI.
 *
 *   * contained model and DI elements, e.g. triggers, guards and effects of transitions,
 *     behaviors of states or attributes of classes, are copied along
 *   * contained elements shown on their own in the diagram, e.g. sub-states, entry
 *     points and labels, are copied only if copied themselves, as are regions, the
 *     updaters of the diagram types placing pasted sub-states in regions of their own
 *   * references to pasted elements are references to their copies, others are kept,
 *     e.g. to the state machine of a submachine state, if in the same document and not
 *     kept by the diagram types
 *
 * Diagram types keep the owners of pasted model elements in sync, as for created ones.
 * Elements are copied when pasted, so they may be pasted in other diagrams of the same
 * type sharing the clipboard, e.g. in other planes; notes in diagrams of any type.
 */
export default function UmlCopyPaste(eventBus, umlFactory, canvas) {

  // the elements shown on their own in the diagram, per copy
  const shownByCopy = new WeakMap();

  eventBus.on('copyPaste.copyElement', LOW_PRIORITY, function(context) {
    const { descriptor, element, elementsSet } = context;

    if (!shownByCopy.has(elementsSet)) {
      shownByCopy.set(elementsSet, getShown(canvas));
    }

    descriptor.businessObject = element.businessObject;
    descriptor.di = element.di;

    descriptor.diagramType = canvas.getRootElement().di.$type;

    // not copied along with the elements containing them
    descriptor.shown = shownByCopy.get(elementsSet);
  });

  // elements are pasted in diagrams of the type they were copied from, notes in all
  eventBus.on('copyPaste.pasteElements', function(context) {
    const diagramType = canvas.getRootElement().di.$type;

    const descriptors = Object.values(context.tree || {}).flat();

    if (descriptors.some(descriptor => descriptor.diagramType !== diagramType && !is(descriptor.businessObject, 'uml:Comment'))) {
      return false;
    }
  });

  eventBus.on('copyPaste.pasteElement', function(context) {
    const { cache, descriptor } = context;

    const copies = cache[COPIES_KEY] || (cache[COPIES_KEY] = new Copies(umlFactory, getTop(canvas.getRootElement().businessObject)));

    const { businessObject, di, shown } = descriptor;

    // labels show the copy of their target, or of an element it contains, e.g. association ends
    descriptor.businessObject = isLabel(descriptor) ? copies.get(businessObject) : copies.copy(businessObject, shown);
    descriptor.di = copies.copy(di, shown);

    delete descriptor.shown;
    delete descriptor.diagramType;
  });
}

UmlCopyPaste.$inject = [ 'eventBus', 'umlFactory', 'canvas' ];


/**
 * Model and DI elements copied in one paste, resolving references among them.
 */
function Copies(umlFactory, top) {
  this._umlFactory = umlFactory;
  this._top = top;

  this._copies = new Map();

  // references to elements not copied yet: [ copy, property name, original ]
  this._references = [];
}

Copies.prototype.get = function(original) {
  return this._copies.get(original) || original;
};

/**
 * @param {ModdleElement} original
 * @param {Set<ModdleElement>} shown elements not copied along with the elements containing them
 *
 * @return {ModdleElement}
 */
Copies.prototype.copy = function(original, shown) {
  const copy = this._umlFactory.create(original.$type);

  this._copies.set(original, copy);

  original.$descriptor.properties.forEach(property => {
    const name = property.name;

    if (property.isId || !Object.prototype.hasOwnProperty.call(original, name)) {
      return;
    }

    const value = original.get(name);

    if (property.isReference) {
      return this._setReference(copy, property, value);
    }

    if (!(isArray(value) ? value.some(isModdleElement) : isModdleElement(value))) {
      return copy.set(name, isArray(value) ? value.slice() : value);
    }

    // regions get placed by the diagram types
    if (name === 'region') {
      return;
    }

    const copyContained = element => {
      const contained = this.copy(element, shown);

      contained.$parent = copy;

      return contained;
    };

    if (isArray(value)) {
      copy.set(name, value.filter(element => !shown.has(element)).map(copyContained));
    } else if (value && !shown.has(value)) {
      copy.set(name, copyContained(value));
    }
  });

  this._resolve(original, copy);

  return copy;
};

Copies.prototype._setReference = function(copy, property, value) {
  const name = property.name;

  const values = (isArray(value) ? value : [ value ]).filter(Boolean);

  const keep = element => !UPDATED_REFERENCES.includes(name) && getTop(element) === this._top;

  const resolved = values.filter(element => this._copies.has(element) || keep(element)).map(element => {
    if (!this._copies.has(element)) {
      this._references.push([ copy, name, element ]);
    }

    return this.get(element);
  });

  copy.set(name, isArray(value) ? resolved : resolved[0]);
};

/**
 * Point references to an element copied now to its copy.
 */
Copies.prototype._resolve = function(original, copy) {
  this._references = this._references.filter(([ element, name, referenced ]) => {
    if (referenced !== original) {
      return true;
    }

    const value = element.get(name);

    element.set(name, isArray(value) ? value.map(e => e === original ? copy : e) : copy);
  });
};


// helpers //////////

/**
 * @return {Set<ModdleElement>} the model and DI elements of the elements of the diagram
 */
function getShown(canvas) {
  const shown = new Set();

  const add = element => {

    // labels show elements contained in others, e.g. association ends
    if (!isLabel(element)) {
      shown.add(element.businessObject);
    }

    shown.add(element.di);

    (element.children || []).forEach(add);
  };

  canvas.getRootElement().children.forEach(add);

  return shown;
}

function isModdleElement(value) {
  return !!value && !!value.$type;
}

function getTop(element) {
  while (element && element.$parent) {
    element = element.$parent;
  }

  return element;
}
