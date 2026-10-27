import inherits from 'inherits-browser';

import { assign } from 'min-dash';

import BaseResizeShapeHandler from 'diagram-js/lib/features/modeling/cmd/ResizeShapeHandler.js';


/**
 * Resizes shapes like diagram-js does, without its fixed minimum of 10px,
 * which bars (fork / join) are thinner than. Limits are left to the rules
 * and the resize constraints of the interaction.
 */
export default function ResizeShapeHandler(modeling) {
  BaseResizeShapeHandler.call(this, modeling);
}

inherits(ResizeShapeHandler, BaseResizeShapeHandler);

ResizeShapeHandler.$inject = [ 'modeling' ];

ResizeShapeHandler.prototype.execute = function(context) {
  const shape = context.shape,
        newBounds = context.newBounds,
        minBounds = context.minBounds;

  if ([ 'x', 'y', 'width', 'height' ].some(name => newBounds[name] === undefined)) {
    throw new Error('newBounds must have {x, y, width, height} properties');
  }

  if (minBounds && (newBounds.width < minBounds.width || newBounds.height < minBounds.height)) {
    throw new Error('width and height cannot be less than minimum height and width');
  }

  context.oldBounds = {
    width: shape.width,
    height: shape.height,
    x: shape.x,
    y: shape.y
  };

  assign(shape, {
    width: newBounds.width,
    height: newBounds.height,
    x: newBounds.x,
    y: newBounds.y
  });

  return shape;
};
