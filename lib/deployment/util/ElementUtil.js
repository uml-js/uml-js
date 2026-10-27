import { is, isLabel } from '../../core/util/ModelUtil.js';

// of the third dimension of nodes
export const DEPTH = 12;

export const HEADER_HEIGHT = 40;


/**
 * Nodes, including devices and execution environments.
 */
export function isNode(element) {
  return is(element, 'uml:Node') && isShape(element);
}

export function isArtifact(element) {
  return is(element, 'uml:Artifact') && isShape(element);
}

function isShape(element) {
  return !isLabel(element) && !(element && element.waypoints);
}

/**
 * @param {ModdleElement} bo
 *
 * @return {string|null} the keyword shown above the name
 */
export function getKeyword(bo) {
  if (is(bo, 'uml:Device')) {
    return 'device';
  }

  if (is(bo, 'uml:ExecutionEnvironment')) {
    return 'executionEnvironment';
  }

  if (is(bo, 'uml:Artifact')) {
    return 'artifact';
  }

  return null;
}

const DEFAULT_SIZES = {
  'uml:Artifact': { width: 140, height: 60 }
};

export function getDefaultSize(bo) {
  return DEFAULT_SIZES[bo.$type] || { width: 240, height: 160 };
}
