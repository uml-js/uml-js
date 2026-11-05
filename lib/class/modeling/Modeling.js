import inherits from 'inherits-browser';

import UmlModeling from '../../core/modeling/UmlModeling.js';

import { is } from '../../core/util/ModelUtil.js';

import ChangeClassifierTypeHandler from './cmd/ChangeClassifierTypeHandler.js';
import ReplaceClassifierHandler from './cmd/ReplaceClassifierHandler.js';
import ReplaceRelationshipHandler from './cmd/ReplaceRelationshipHandler.js';
import SetAggregationHandler from './cmd/SetAggregationHandler.js';
import UnreferenceTypeHandler from './cmd/UnreferenceTypeHandler.js';
import UpdateEndHandler from './cmd/UpdateEndHandler.js';
import UpdateMembersHandler from './cmd/UpdateMembersHandler.js';
import ReplaceConnectionHandler from '../../core/modeling/cmd/ReplaceConnectionHandler.js';


/**
 * Class diagram modeling: UML modeling plus editing members and
 * association ends, and changing the type of classifiers and relationships.
 */
export default function Modeling(eventBus, elementFactory, commandStack, rules) {
  UmlModeling.call(this, eventBus, elementFactory, commandStack);

  this._rules = rules;
}

inherits(Modeling, UmlModeling);

Modeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack',
  'rules'
];

Modeling.prototype.getHandlers = function() {
  const handlers = UmlModeling.prototype.getHandlers.call(this);

  handlers['classifier.updateMembers'] = UpdateMembersHandler;
  handlers['classifier.changeType'] = ChangeClassifierTypeHandler;
  handlers['association.updateEnd'] = UpdateEndHandler;
  handlers['association.setAggregation'] = SetAggregationHandler;
  handlers['connection.replace'] = ReplaceConnectionHandler;
  handlers['classifier.replace'] = ReplaceClassifierHandler;
  handlers['relationship.replace'] = ReplaceRelationshipHandler;
  handlers['type.unreference'] = UnreferenceTypeHandler;

  return handlers;
};

/**
 * @param {Shape} element a classifier
 * @param {'name'|'attributes'|'operations'|'literals'} compartment
 * @param {string} text one member per line
 */
Modeling.prototype.updateMembers = function(element, compartment, text) {
  this._commandStack.execute('classifier.updateMembers', {
    element,
    compartment,
    text
  });
};

/**
 * @param {Shape} element a classifier
 * @param {string} type e.g. `uml:Interface`
 */
Modeling.prototype.changeClassifierType = function(element, type) {
  this._commandStack.execute('classifier.changeType', {
    element,
    type
  });
};

/**
 * @param {Connection} connection an association
 * @param {number} index 0 for the source end, 1 for the target end
 * @param {string} text e.g. `items 0..*`
 */
Modeling.prototype.updateEnd = function(connection, index, text) {
  this._commandStack.execute('association.updateEnd', {
    connection,
    index,
    text
  });
};

/**
 * @param {Connection} connection an association
 * @param {'none'|'shared'|'composite'} aggregation
 * @param {number} [part=1] the end of the part, 0 for the source, 1 for the target;
 *   the diamond is drawn at the other end, the whole
 */
Modeling.prototype.setAggregation = function(connection, aggregation, part = 1) {
  this._commandStack.execute('association.setAggregation', {
    connection,
    aggregation,
    part
  });
};

/**
 * Reverse the direction of a generalization, interface realization or dependency
 * by reconnecting it the other way round, or move the diamond of an aggregation
 * or composition to the other end.
 *
 * @param {Connection} connection
 */
Modeling.prototype.reverseRelationship = function(connection) {
  if (is(connection, 'uml:Association')) {
    const ends = connection.businessObject.get('memberEnd');
    const part = ends.findIndex(end => end.aggregation && end.aggregation !== 'none');

    if (part !== -1) {
      this.setAggregation(connection, ends[part].aggregation, 1 - part);
    }

    return;
  }

  this.reconnect(connection, connection.target, connection.source, [ ...connection.waypoints ].reverse());
};

/**
 * Replace a relationship with one of another type, e.g. an association with a generalization.
 *
 * @param {Connection} connection
 * @param {string} type
 *
 * @return {Connection} the new connection
 */
Modeling.prototype.replaceConnection = function(connection, type) {
  const context = {
    connection,
    attrs: { type }
  };

  this._commandStack.execute('connection.replace', context);

  return context.newConnection;
};

/**
 * Change a classifier into a class, an abstract class, an interface or an enumeration.
 *
 * @param {Shape} element
 * @param {{ type: string, isAbstract?: boolean }} target
 */
Modeling.prototype.replaceClassifier = function(element, target) {
  this._commandStack.execute('classifier.replace', {
    element,
    ...target
  });
};

/**
 * Change a relationship into another kind.
 *
 * @param {Connection} connection
 * @param {{ type: string, aggregation?: 'none'|'shared'|'composite', part?: number }} target the type, and
 *   for aggregations and compositions the kind and the end of the part (see #setAggregation)
 *
 * @return {Connection} the changed connection, which may be a new one
 */
Modeling.prototype.replaceRelationship = function(connection, target) {
  const context = {
    connection,
    ...target
  };

  this._commandStack.execute('relationship.replace', context);

  return context.newConnection;
};

/**
 * The relationship type depends on what is connected, see ClassRules#canConnect.
 */
Modeling.prototype.getConnectionAttrs = function(source, target) {
  const allowed = this._rules.allowed('connection.create', { source, target });

  return allowed && allowed.type ? { ...allowed } : {};
};
