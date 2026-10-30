/**
 * Where the external label of a connection moves when the connection changes
 * shape: with the point of the connection it is attached to, on the segment or
 * bendpoint nearest to it, keeping its distance and angle to that point.
 *
 * Adapted from bpmn-js, LabelLayoutUtil, LayoutUtil and LineAttachmentUtil
 * (https://github.com/bpmn-io/bpmn-js), Copyright (c) 2014-present Camunda
 * Services GmbH, under the bpmn.io license (MIT, with a watermark clause for
 * rendered BPMN diagrams, which does not apply here).
 */

import { getMid, roundPoint } from 'diagram-js/lib/layout/LayoutUtil.js';

import { getAngle, getDistancePointPoint, rotateVector } from 'diagram-js/lib/features/bendpoints/GeometricUtil.js';

// matching threshold to work around precision errors in intersection computation
const EQUAL_THRESHOLD = 0.1;


/**
 * @typedef { {
 *   segmentMove?: { segmentStartIndex: number, newSegmentStartIndex: number },
 *   bendpointMove?: { insert: boolean, bendpointIndex: number },
 *   connectionStart?: boolean,
 *   connectionEnd?: boolean
 * } } LayoutHints
 */

/**
 * @param {Shape} label
 * @param {Point[]} newWaypoints
 * @param {Point[]} oldWaypoints
 * @param {LayoutHints} [hints] what changed about the connection
 *
 * @return {Point} how far the label moves
 */
export function getLabelAdjustment(label, newWaypoints, oldWaypoints, hints = {}) {
  return getAnchorPointAdjustment(getMid(label), newWaypoints, oldWaypoints, hints).delta;
}

/**
 * @param {Point} position
 * @param {Point[]} newWaypoints
 * @param {Point[]} oldWaypoints
 * @param {LayoutHints} hints
 *
 * @return { { point: Point, delta: Point } }
 */
export function getAnchorPointAdjustment(position, newWaypoints, oldWaypoints, hints) {
  const unchanged = { point: position, delta: { x: 0, y: 0 } };

  const attachment = getAttachment(position, oldWaypoints);
  const oldLineIndex = attachment.segmentIndex;
  const newLineIndex = findNewLineStartIndex(oldWaypoints, newWaypoints, attachment, hints);

  if (newLineIndex === null || newLineIndex < 0 || newLineIndex > newWaypoints.length - 2) {
    return unchanged;
  }

  const oldLine = getLine(oldWaypoints, oldLineIndex);
  const newLine = getLine(newWaypoints, newLineIndex);
  const oldFoot = attachment.position;

  let relativeFootPosition = getRelativeFootPosition(oldLine, oldFoot);

  const angleDelta = getAngle(newLine) - getAngle(oldLine);

  // attached to a bendpoint
  if (attachment.type === 'bendpoint') {
    const offset = newWaypoints.length - oldWaypoints.length;
    const oldBendpointIndex = attachment.bendpointIndex;
    const oldBendpoint = oldWaypoints[oldBendpointIndex];

    // the bendpoint did not move
    if (newWaypoints.indexOf(oldBendpoint) !== -1) {
      return unchanged;
    }

    // the bendpoint moved
    if (offset === 0) {
      const newBendpoint = newWaypoints[oldBendpointIndex];

      const delta = roundPoint({ x: newBendpoint.x - attachment.position.x, y: newBendpoint.y - attachment.position.y });

      return {
        delta,
        point: { x: position.x + delta.x, y: position.y + delta.y }
      };
    }

    // bendpoints were removed
    if (offset < 0 && oldBendpointIndex !== 0 && oldBendpointIndex < oldWaypoints.length - 1) {
      relativeFootPosition = relativePositionMidWaypoint(oldWaypoints, oldBendpointIndex);
    }
  }

  const newFoot = {
    x: (newLine[1].x - newLine[0].x) * relativeFootPosition + newLine[0].x,
    y: (newLine[1].y - newLine[0].y) * relativeFootPosition + newLine[0].y
  };

  // the vector from the line to the label, rotated with the line
  const newLabelVector = rotateVector({ x: position.x - oldFoot.x, y: position.y - oldFoot.y }, angleDelta);

  return {
    point: roundPoint(newFoot),
    delta: roundPoint({
      x: newFoot.x + newLabelVector.x - position.x,
      y: newFoot.y + newLabelVector.y - position.y
    })
  };
}

/**
 * @param {Point[]} oldWaypoints
 * @param {Point[]} newWaypoints
 * @param {Attachment} attachment
 * @param {LayoutHints} hints
 *
 * @return {number} the index of the segment of the new waypoints the attachment is on
 */
export function findNewLineStartIndex(oldWaypoints, newWaypoints, attachment, hints) {
  const index = attachment.segmentIndex;
  const offset = newWaypoints.length - oldWaypoints.length;

  if (hints.segmentMove) {
    const { segmentStartIndex, newSegmentStartIndex } = hints.segmentMove;

    // on the moved segment
    if (index === segmentStartIndex) {
      return newSegmentStartIndex;
    }

    // after the moved segment
    if (index >= newSegmentStartIndex) {
      return (index + offset < newSegmentStartIndex) ? newSegmentStartIndex : index + offset;
    }

    // before it
    return index;
  }

  if (hints.bendpointMove) {
    const { insert, bendpointIndex } = hints.bendpointMove;

    if (offset === 0) {
      return index;
    }

    // behind the added or removed bendpoint
    if (index >= bendpointIndex) {
      return insert ? index + 1 : index - 1;
    }

    // before it: on the left or the right part of a split segment
    if (insert && attachment.type !== 'bendpoint' && bendpointIndex - 1 === index) {
      const rel = relativePositionMidWaypoint(newWaypoints, bendpointIndex);

      if (rel < attachment.relativeLocation) {
        return index + 1;
      }
    }

    return index;
  }

  // start or end changed
  if (offset === 0) {
    return index;
  }

  // the new segment running like the one the point was on, nearest to the point; differing
  // from bpmn-js, which takes the first or last segment, as moving an element gives both a
  // new start and end as hints, and the layout may add the bendpoint at either end
  const matching = findMatchingSegment(oldWaypoints, newWaypoints, attachment);

  if (matching !== -1) {
    return matching;
  }

  if (hints.connectionStart && index === 0) {
    return 0;
  }

  if (hints.connectionEnd && index === oldWaypoints.length - 2) {
    return newWaypoints.length - 2;
  }

  // if nothing fits, the middle segment
  return Math.floor((newWaypoints.length - 2) / 2);
}

/**
 * @typedef { {
 *   type: 'bendpoint' | 'segment',
 *   position: Point,
 *   segmentIndex: number,
 *   bendpointIndex?: number,
 *   relativeLocation?: number
 * } } Attachment
 */

/**
 * The attachment of a point to a line: the bendpoint or the point of the segment
 * nearest to it.
 *
 * @param {Point} point
 * @param {Point[]} line
 *
 * @return {Attachment}
 */
export function getAttachment(point, line) {
  let closest, closestDistance;

  for (let index = 0; index < line.length - 1; index++) {
    const segmentStart = line[index], segmentEnd = line[index + 1];

    const intersections = pointsEqual(segmentStart, segmentEnd)
      ? [ segmentStart ]
      : getCircleSegmentIntersections(segmentStart, segmentEnd, point, Math.min(getDistance(point, segmentStart), getDistance(point, segmentEnd)));

    if (intersections.length < 1) {
      throw new Error('expected between [1, 2] circle -> line intersections');
    }

    let attachment;

    // one intersection: attached to a bendpoint
    if (intersections.length === 1) {
      attachment = {
        type: 'bendpoint',
        position: intersections[0],
        segmentIndex: index,
        bendpointIndex: pointsEqual(segmentStart, intersections[0]) ? index : index + 1
      };
    }

    // two intersections: attached to the segment
    if (intersections.length === 2) {
      const position = mid(intersections[0], intersections[1]);

      attachment = {
        type: 'segment',
        position,
        segmentIndex: index,
        relativeLocation: getDistance(segmentStart, position) / getDistance(segmentStart, segmentEnd)
      };
    }

    const distance = getDistance(attachment.position, point);

    if (!closest || closestDistance > distance) {
      closest = attachment;
      closestDistance = distance;
    }
  }

  return closest;
}


// helpers //////////

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function getCircleSegmentIntersections(s1, s2, cc, cr) {
  const baX = s2.x - s1.x;
  const baY = s2.y - s1.y;
  const caX = cc.x - s1.x;
  const caY = cc.y - s1.y;

  const a = baX * baX + baY * baY;
  const bBy2 = baX * caX + baY * caY;
  const c = caX * caX + caY * caY - cr * cr;

  const pBy2 = bBy2 / a;
  const q = c / a;

  let disc = pBy2 * pBy2 - q;

  // negative, very close to zero results (-4e-15) in some environments
  if (disc < 0 && disc > -0.000001) {
    disc = 0;
  }

  if (disc < 0) {
    return [];
  }

  const tmpSqrt = Math.sqrt(disc);
  const abScalingFactor1 = -pBy2 + tmpSqrt;
  const abScalingFactor2 = -pBy2 - tmpSqrt;

  const i1 = { x: s1.x - baX * abScalingFactor1, y: s1.y - baY * abScalingFactor1 };

  if (disc === 0) {
    return [ i1 ];
  }

  const i2 = { x: s1.x - baX * abScalingFactor2, y: s1.y - baY * abScalingFactor2 };

  // only points on the segment
  return [ i1, i2 ].filter(p => isPointInSegment(p, s1, s2));
}

function isPointInSegment(p, segmentStart, segmentEnd) {
  return fenced(p.x, segmentStart.x, segmentEnd.x) && fenced(p.y, segmentStart.y, segmentEnd.y);
}

function fenced(n, rangeStart, rangeEnd) {
  return n >= Math.min(rangeStart, rangeEnd) - EQUAL_THRESHOLD && n <= Math.max(rangeStart, rangeEnd) + EQUAL_THRESHOLD;
}

function mid(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function pointsEqual(p1, p2) {
  return Math.abs(p1.x - p2.x) <= EQUAL_THRESHOLD && Math.abs(p1.y - p2.y) <= EQUAL_THRESHOLD;
}

/**
 * @return {number} the index of the horizontal or vertical segment of the new waypoints running
 * like the one of the attachment, nearest to it, -1 if there is none
 */
function findMatchingSegment(oldWaypoints, newWaypoints, attachment) {
  const oldLine = getLine(oldWaypoints, attachment.segmentIndex);
  const orientation = getOrientation(oldLine);

  if (!orientation) {
    return -1;
  }

  const relativeFootPosition = getRelativeFootPosition(oldLine, attachment.position);

  let best = -1, bestDistance = Infinity;

  for (let index = 0; index < newWaypoints.length - 1; index++) {
    const line = getLine(newWaypoints, index);

    if (getOrientation(line) !== orientation) {
      continue;
    }

    const foot = {
      x: line[0].x + (line[1].x - line[0].x) * relativeFootPosition,
      y: line[0].y + (line[1].y - line[0].y) * relativeFootPosition
    };

    const distance = getDistance(foot, attachment.position);

    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }

  return best;
}

function getOrientation([ start, end ]) {
  if (pointsEqual(start, end)) {
    return null;
  }

  if (Math.abs(start.y - end.y) <= EQUAL_THRESHOLD) {
    return 'h';
  }

  if (Math.abs(start.x - end.x) <= EQUAL_THRESHOLD) {
    return 'v';
  }

  return null;
}

function relativePositionMidWaypoint(waypoints, index) {
  const distanceSegment1 = getDistancePointPoint(waypoints[index - 1], waypoints[index]),
        distanceSegment2 = getDistancePointPoint(waypoints[index], waypoints[index + 1]);

  return distanceSegment1 / (distanceSegment1 + distanceSegment2);
}

function getLine(waypoints, index) {
  return [ waypoints[index], waypoints[index + 1] ];
}

function getRelativeFootPosition(line, foot) {
  const length = getDistancePointPoint(line[0], line[1]),
        lengthToFoot = getDistancePointPoint(line[0], foot);

  return length === 0 ? 0 : lengthToFoot / length;
}
