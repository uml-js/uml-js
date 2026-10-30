import inherits from 'inherits-browser';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor.js';

import { getMid } from 'diagram-js/lib/layout/LayoutUtil.js';

import { getApproxIntersection } from 'diagram-js/lib/util/LineIntersection.js';

const HIGH_PRIORITY = 1500;


/**
 * Splits a connection a shape is dropped on, created or moved: the connection is
 * reconnected to end at the shape, and a new connection of its type leads on from
 * the shape to its old target, both as far as the rules allow.
 *
 * Diagram types allow inserting shapes into connections with the rule `shape.insert`
 * ({ shape, connection }), and creating and moving shapes onto connections then.
 * Hovering the label of a connection while creating or moving a shape is hovering
 * the connection, as labels often lie on their connection.
 *
 * Adapted from bpmn-js, DropOnFlowBehavior (https://github.com/bpmn-io/bpmn-js),
 * Copyright (c) 2014-present Camunda Services GmbH, under the bpmn.io license.
 */
export default function DropOnConnectionBehavior(eventBus, rules, modeling, elementRegistry) {

  CommandInterceptor.call(this, eventBus);

  eventBus.on([
    'create.hover',
    'create.move',
    'create.out',
    'create.end',
    'shape.move.hover',
    'shape.move.move',
    'shape.move.out',
    'shape.move.end'
  ], HIGH_PRIORITY, function(event) {
    const hover = event.hover;
    const shape = event.context.shape || event.shape;

    if (hover && hover.labelTarget && hover.labelTarget.waypoints && shape && !shape.labelTarget) {
      event.hover = hover.labelTarget;
      event.hoverGfx = elementRegistry.getGraphics(event.hover);
    }
  });

  const canInsert = (shape, connection) => !!connection && !!connection.waypoints && rules.allowed('shape.insert', { shape, connection });

  const canConnect = (source, target) => rules.allowed('connection.create', { source, target });

  function insertShape(shape, connection, positionOrBounds) {
    const waypoints = connection.waypoints;
    const oldIncoming = shape.incoming.slice(), oldOutgoing = shape.outgoing.slice();

    const mid = typeof positionOrBounds.width === 'number' ? getMid(positionOrBounds) : positionOrBounds;

    let waypointsBefore, waypointsAfter;

    const intersection = getApproxIntersection(waypoints, mid);

    if (intersection) {
      waypointsBefore = waypoints.slice(0, intersection.index);
      waypointsAfter = waypoints.slice(intersection.index + (intersection.bendpoint ? 1 : 0));

      // due to inaccuracy an intersection may have been found
      if (!waypointsBefore.length || !waypointsAfter.length) {
        return;
      }

      const dockingPoint = intersection.bendpoint ? waypoints[intersection.index] : mid;

      // the docking point only if the last waypoint before is outside the shape
      if (waypointsBefore.length === 1 || !isPointInside(shape, waypointsBefore[waypointsBefore.length - 1])) {
        waypointsBefore.push({ ...dockingPoint });
      }

      // the docking point only if the first waypoint after is outside the shape
      if (waypointsAfter.length === 1 || !isPointInside(shape, waypointsAfter[0])) {
        waypointsAfter.unshift({ ...dockingPoint });
      }
    }

    const { source, target } = connection;

    let incoming, outgoing;

    if (canConnect(source, shape)) {

      // source -> inserted shape
      modeling.reconnectEnd(connection, shape, waypointsBefore || mid);

      incoming = connection;
    }

    if (canConnect(shape, target)) {
      if (!incoming) {

        // inserted shape -> target
        modeling.reconnectStart(connection, shape, waypointsAfter || mid);

        outgoing = connection;
      } else {
        outgoing = modeling.connect(shape, target, { type: connection.type, waypoints: waypointsAfter });
      }
    }

    // connections the shape had to the same source or target before
    const duplicates = [
      ...(incoming ? oldIncoming.filter(c => c.source === incoming.source) : []),
      ...(outgoing ? oldOutgoing.filter(c => c.target === outgoing.target) : [])
    ];

    if (duplicates.length) {
      modeling.removeElements(duplicates);
    }
  }

  this.preExecute('elements.move', function(event) {
    const context = event.context;
    const { shapes, delta } = context;
    const shape = shapes[0];

    let newParent = context.newParent;

    if (!shape || !newParent) {
      return;
    }

    // moved onto a connection: into its parent
    if (newParent.waypoints) {
      context.newParent = newParent = newParent.parent;
    }

    if (shapes.length !== 1) {
      return;
    }

    const mid = getMid(shape);
    const newMid = { x: mid.x + delta.x, y: mid.y + delta.y };

    // the connection the middle of the shape is moved onto
    const connection = newParent.children.find(element => {
      return canInsert(shape, element) && getApproxIntersection(element.waypoints, newMid);
    });

    if (connection) {
      context.targetConnection = connection;
      context.position = newMid;
    }
  });

  this.postExecuted('elements.move', function(event) {
    const { shapes, targetConnection, position } = event.context;

    if (targetConnection) {
      insertShape(shapes[0], targetConnection, position);
    }
  });

  this.preExecute('shape.create', function(event) {
    const context = event.context;
    const { parent, shape } = context;

    if (canInsert(shape, parent)) {
      context.targetConnection = parent;
      context.parent = parent.parent;
    }
  });

  this.postExecuted('shape.create', function(event) {
    const { shape, targetConnection, position } = event.context;

    if (targetConnection) {
      insertShape(shape, targetConnection, position);
    }
  });
}

inherits(DropOnConnectionBehavior, CommandInterceptor);

DropOnConnectionBehavior.$inject = [
  'eventBus',
  'rules',
  'modeling',
  'elementRegistry'
];


// helpers //////////

function isPointInside(bounds, { x, y }) {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}
