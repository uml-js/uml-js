import { Ids } from 'ids';


/**
 * Creates UML and UML DI moddle elements with unique IDs.
 *
 * @param {UmlModdle} moddle
 */
export default function UmlFactory(moddle) {
  this._model = moddle;
  this._ids = new Ids([ 32, 36, 1 ]);
}

UmlFactory.$inject = [ 'moddle' ];

/**
 * @param {string} type
 * @param {Object} [attrs]
 *
 * @return {ModdleElement}
 */
UmlFactory.prototype.create = function(type, attrs = {}) {
  const element = this._model.create(type, attrs);

  if (!element.id && this._needsId(element)) {
    element.id = this._ids.nextPrefixed(type.split(':')[1] + '_', element);
  }

  return element;
};

UmlFactory.prototype._needsId = function(element) {
  return element.$instanceOf('uml:Element') || element.$instanceOf('di:DiagramElement');
};

UmlFactory.prototype.createBounds = function(bounds) {
  return this.create('dc:Bounds', {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  });
};

UmlFactory.prototype.createPoints = function(waypoints) {
  return waypoints.map(point => this.create('dc:Point', {
    x: Math.round(point.x),
    y: Math.round(point.y)
  }));
};

/**
 * @param {ModdleElement} modelElement
 * @param {Object} [attrs]
 * @param {string} [type='umldi:UMLShape']
 */
UmlFactory.prototype.createDiShape = function(modelElement, attrs = {}, type = 'umldi:UMLShape') {
  return this.create(type, {
    modelElement: [ modelElement ],
    ...attrs
  });
};

UmlFactory.prototype.createDiEdge = function(modelElement, attrs = {}, type = 'umldi:UMLEdge') {
  return this.create(type, {
    modelElement: [ modelElement ],
    ...attrs
  });
};

UmlFactory.prototype.createDiLabel = function(modelElement, attrs = {}, type = 'umldi:UMLLabel') {
  return this.create(type, {
    modelElement: [ modelElement ],
    ...attrs
  });
};
