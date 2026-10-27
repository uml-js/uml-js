/**
 * Removes elements from and adds them to collections, restoring the original
 * position when an element is added back to a collection it was removed from.
 *
 * This keeps the order of model elements stable when commands are undone.
 */
export default class PositionTracker {

  constructor() {

    /**
     * @type {WeakMap<Object, Map<Array, number>>} element -> collection -> index
     */
    this._positions = new WeakMap();
  }

  remove(collection, element) {
    const index = collection.indexOf(element);

    if (index === -1) {
      return;
    }

    collection.splice(index, 1);

    if (!this._positions.has(element)) {
      this._positions.set(element, new Map());
    }

    this._positions.get(element).set(collection, index);
  }

  add(collection, element) {
    if (collection.includes(element)) {
      return;
    }

    const positions = this._positions.get(element);
    const index = positions && positions.get(collection);

    if (index !== undefined) {
      collection.splice(Math.min(index, collection.length), 0, element);
    } else {
      collection.push(element);
    }
  }
}
