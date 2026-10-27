/**
 * The path of a connection along its original (uncropped) waypoints, so that
 * cropping finds the outline of non-rectangular shapes, too, e.g. ellipses
 * or the tab of packages, rather than stopping at their bounding box.
 *
 * Adapted from bpmn-js, BpmnRenderer#getConnectionPath (https://github.com/bpmn-io/bpmn-js).
 *
 * @param {Connection} connection
 *
 * @return {string}
 */
export function getConnectionPath(connection) {
  return connection.waypoints
    .map(point => point.original || point)
    .map((point, idx) => `${ idx ? 'L' : 'M' }${ point.x },${ point.y }`)
    .join('');
}
