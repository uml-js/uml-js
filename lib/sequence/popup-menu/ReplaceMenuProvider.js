import { REPLACE_MENU_ID } from '../../core/popup-menu/ReplaceMenu.js';

import { isCombinedFragment, isMessage, isOperand } from '../util/ElementUtil.js';

import { ICONS } from '../icons.js';

const MESSAGE_SORTS = [
  { sort: 'synchCall', label: 'Synchronous message', icon: ICONS.synchCall },
  { sort: 'asynchCall', label: 'Asynchronous message', icon: ICONS.asynchCall },
  { sort: 'reply', label: 'Reply message', icon: ICONS.reply }
];


const OPERATORS = [
  [ 'loop', 'Loop' ],
  [ 'alt', 'Alternatives' ],
  [ 'opt', 'Option' ],
  [ 'par', 'Parallel' ],
  [ 'break', 'Break' ],
  [ 'critical', 'Critical region' ],
  [ 'neg', 'Negative' ],
  [ 'assert', 'Assertion' ],
  [ 'strict', 'Strict sequencing' ],
  [ 'seq', 'Weak sequencing' ],
  [ 'ignore', 'Ignore' ],
  [ 'consider', 'Consider' ]
];


/**
 * Replace menu provider for sequence diagrams: the sort of messages and the
 * operator of combined fragments (also offered for their operands).
 */
export default function ReplaceMenuProvider(popupMenu, modeling) {
  this._modeling = modeling;

  popupMenu.registerProvider(REPLACE_MENU_ID, this);
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling'
];

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  const modeling = this._modeling;

  const entries = {};

  const fragment = isOperand(element) ? element.parent : element;

  if (isCombinedFragment(fragment)) {
    const current = fragment.businessObject.interactionOperator || 'seq';

    for (const [ operator, label ] of OPERATORS) {
      if (operator !== current) {
        entries[`replace-with-${ operator }`] = {
          label: `${ label } (${ operator })`,
          imageUrl: ICONS.combinedFragment,

          // weak sequencing is the default, not to be written
          action: () => modeling.updateProperties(fragment, { interactionOperator: operator === 'seq' ? undefined : operator })
        };
      }
    }

    return entries;
  }

  if (!isMessage(element)) {
    return entries;
  }

  const current = element.businessObject.messageSort || 'synchCall';

  for (const { sort, label, icon } of MESSAGE_SORTS) {
    if (sort === current) {
      continue;
    }

    entries[`replace-with-${ sort }`] = {
      label,
      imageUrl: icon,

      // synchronous calls are the default, not to be written
      action: () => modeling.updateProperties(element, { messageSort: sort === 'synchCall' ? undefined : sort })
    };
  }

  return entries;
};
