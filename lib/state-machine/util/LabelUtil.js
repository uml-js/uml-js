import { is } from '../../core/util/ModelUtil.js';

/**
 * Mapping between the textual notation of state machine
 * elements and their UML model:
 *
 *   * transitions: `trigger1, trigger2 [guard] / effect`
 *   * states: name, followed by one line per internal activity
 *     (`entry / ...`, `do / ...`, `exit / ...`); other lines are kept
 *     as text of a comment of the state
 */

export const ACTIVITIES = [
  { property: 'entry', keyword: 'entry' },
  { property: 'doActivity', keyword: 'do' },
  { property: 'exit', keyword: 'exit' }
];


// text //////////

export function getTriggerText(trigger) {
  return trigger.name || (trigger.event && trigger.event.name) || '';
}

export function getConstraintText(constraint) {
  if (!constraint) {
    return '';
  }

  const specification = constraint.specification;

  if (is(specification, 'uml:OpaqueExpression')) {
    return specification.get('body').join(' ');
  }

  return constraint.name || '';
}

export function getBehaviorText(behavior) {
  if (!behavior) {
    return '';
  }

  if (is(behavior, 'uml:OpaqueBehavior') && behavior.get('body').length) {
    return behavior.get('body').join(' ');
  }

  return behavior.name || '';
}

/**
 * @param {ModdleElement} transition
 *
 * @return {string}
 */
export function getTransitionText(transition) {
  const triggers = transition.get('trigger').map(getTriggerText).filter(Boolean).join(', ');
  const guard = getConstraintText(transition.guard);
  const effect = getBehaviorText(transition.effect);

  let text = triggers;

  if (guard) {
    text += ` [${ guard }]`;
  }

  if (effect) {
    text += ` / ${ effect }`;
  }

  return text.trim();
}

/**
 * @param {ModdleElement} state
 *
 * @return { Array<{ keyword: string, text: string }> }
 */
export function getActivities(state) {
  return ACTIVITIES
    .filter(({ property }) => state[property])
    .map(({ property, keyword }) => ({ keyword, text: getBehaviorText(state[property]) }));
}

/**
 * @param {ModdleElement} state
 *
 * @return {string}
 */
export function getStateText(state) {
  return [
    state.name || '',
    ...getCompartmentLines(state)
  ].join('\n');
}

/**
 * @param {ModdleElement} state
 *
 * @return {string[]} the lines shown below the name: the internal activities, then other text
 */
export function getCompartmentLines(state) {
  const comment = getKeptText(state);

  return [
    ...getActivities(state).map(({ keyword, text }) => `${ keyword } / ${ text }`),
    ...(comment ? comment.split('\n') : [])
  ];
}

/**
 * @param {ModdleElement} state
 *
 * @return {string} text below the name which is no internal activity, kept as comment of the state
 */
export function getKeptText(state) {
  const comment = state.get('ownedComment')[0];

  return (comment && comment.body) || '';
}


// parsing //////////

/**
 * @param {string} text
 *
 * @return { { triggers: string[], guard: string, effect: string } }
 */
export function parseTransitionText(text) {
  const match = /^([^[/]*)(?:\[([^\]]*)\]?)?\s*(?:\/([\s\S]*))?$/.exec(text.trim());

  if (!match) {
    return { triggers: [], guard: '', effect: text.trim() };
  }

  const [ , triggers = '', guard = '', effect = '' ] = match;

  return {
    triggers: triggers.split(',').map(t => t.trim()).filter(Boolean),
    guard: guard.trim(),
    effect: effect.trim()
  };
}

/**
 * @param {string} text
 *
 * @return { { name: string, entry: string, doActivity: string, exit: string, other: string } }
 */
export function parseStateText(text) {
  const result = { name: '', entry: '', doActivity: '', exit: '', other: '' };

  const other = [];

  text.split(/\r?\n/).forEach((line, index) => {
    const match = /^\s*(entry|do|exit)\s*\/\s*(.*)$/.exec(line);

    if (match) {
      const { property } = ACTIVITIES.find(a => a.keyword === match[1]);

      result[property] = match[2].trim();
    } else if (index === 0) {
      result.name = line.trim();
    } else if (line.trim()) {
      other.push(line.trim());
    }
  });

  result.other = other.join('\n');

  return result;
}

// model updates //////////

/**
 * Compute the model properties that represent the given text,
 * re-using existing model elements where their text did not change.
 *
 * @param {ModdleElement} bo
 * @param {string} text
 * @param {UmlFactory} umlFactory
 *
 * @return {Object} properties to set on the business object
 */
export function getLabelProperties(bo, text, umlFactory) {

  if (is(bo, 'uml:Transition')) {
    return getTransitionProperties(bo, text, umlFactory);
  }

  if (is(bo, 'uml:State') && !is(bo, 'uml:FinalState')) {
    return getStateProperties(bo, text, umlFactory);
  }

  return { name: text.trim() || undefined };
}

/**
 * @param {ModdleElement} bo
 *
 * @return {string[]} names of the properties affected by label changes
 */
export function getLabelPropertyNames(bo) {

  if (is(bo, 'uml:Transition')) {
    return [ 'trigger', 'guard', 'ownedRule', 'effect' ];
  }

  if (is(bo, 'uml:State') && !is(bo, 'uml:FinalState')) {
    return [ 'name', 'entry', 'doActivity', 'exit', 'ownedComment' ];
  }

  return [ 'name' ];
}

function getTransitionProperties(transition, text, umlFactory) {
  const parsed = parseTransitionText(text);

  const oldTriggers = transition.get('trigger');

  const trigger = parsed.triggers.map(name => {
    return oldTriggers.find(t => getTriggerText(t) === name) || createChild(umlFactory, 'uml:Trigger', { name }, transition);
  });

  let guard = transition.guard;
  let ownedRule = transition.get('ownedRule');

  if (parsed.guard !== getConstraintText(guard)) {
    ownedRule = ownedRule.filter(rule => rule !== guard);

    guard = undefined;

    if (parsed.guard) {
      guard = createChild(umlFactory, 'uml:Constraint', {}, transition);

      guard.specification = createChild(umlFactory, 'uml:OpaqueExpression', { body: [ parsed.guard ] }, guard);

      ownedRule = [ ...ownedRule, guard ];
    }
  }

  let effect = transition.effect;

  if (parsed.effect !== getBehaviorText(effect)) {
    effect = parsed.effect ? createOpaqueBehavior(umlFactory, parsed.effect, transition) : undefined;
  }

  return { trigger, guard, ownedRule, effect };
}

function getStateProperties(state, text, umlFactory) {
  const parsed = parseStateText(text);

  const properties = { name: parsed.name || undefined };

  for (const { property } of ACTIVITIES) {
    const behavior = state[property];

    if (parsed[property] === getBehaviorText(behavior)) {
      properties[property] = behavior;
    } else {
      properties[property] = parsed[property] ? createOpaqueBehavior(umlFactory, parsed[property], state) : undefined;
    }
  }

  // other text is kept as the first comment of the state, replacing the one kept before
  const comments = state.get('ownedComment');

  if (parsed.other === getKeptText(state)) {
    properties.ownedComment = comments;
  } else {
    properties.ownedComment = [
      ...(parsed.other ? [ createChild(umlFactory, 'uml:Comment', { body: parsed.other }, state) ] : []),
      ...comments.slice(getKeptText(state) ? 1 : 0)
    ];
  }

  return properties;
}

function createOpaqueBehavior(umlFactory, body, parent) {
  return createChild(umlFactory, 'uml:OpaqueBehavior', { body: [ body ] }, parent);
}

function createChild(umlFactory, type, attrs, parent) {
  const element = umlFactory.create(type, attrs);

  element.$parent = parent;

  return element;
}
