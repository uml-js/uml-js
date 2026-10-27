import { assign } from 'min-dash';

import TextUtil from 'diagram-js/lib/util/Text.js';

const DEFAULT_FONT_SIZE = 12;
const LINE_HEIGHT_RATIO = 1.2;

const MIN_EXTERNAL_LABEL_WIDTH = 30;
const MAX_EXTERNAL_LABEL_WIDTH = 200;


/**
 * Renders and measures text, shared by all UML diagram types.
 *
 * @param {Object} [config]
 */
export default function TextRenderer(config) {

  const defaultStyle = assign({
    fontFamily: 'Arial, sans-serif',
    fontSize: DEFAULT_FONT_SIZE,
    fontWeight: 'normal',
    lineHeight: LINE_HEIGHT_RATIO
  }, config && config.defaultStyle || {});

  const textUtil = new TextUtil({
    style: defaultStyle
  });

  /**
   * Bounds for a label positioned freely on the canvas, centered
   * horizontally on the given bounds.
   *
   * @param {Bounds} bounds
   * @param {string} text
   *
   * @return {Bounds}
   */
  this.getExternalLabelBounds = function(bounds, text) {
    const dimensions = textUtil.getDimensions(text || ' ', {
      box: {
        width: MAX_EXTERNAL_LABEL_WIDTH,
        height: 30,
        x: bounds.width / 2 + bounds.x,
        y: bounds.height / 2 + bounds.y
      },
      style: defaultStyle,
      padding: 0
    });

    const width = Math.max(MIN_EXTERNAL_LABEL_WIDTH, Math.ceil(dimensions.width));

    return {
      x: Math.round(bounds.x + bounds.width / 2 - width / 2),
      y: Math.round(bounds.y),
      width,
      height: Math.ceil(dimensions.height)
    };
  };

  /**
   * @param {string} text
   * @param {Object} options see diagram-js/lib/util/Text#createText
   *
   * @return {SVGElement}
   */
  this.createText = function(text, options) {
    return textUtil.createText(text, assign({ style: defaultStyle }, options || {}));
  };

  this.getDefaultStyle = function() {
    return defaultStyle;
  };
}

TextRenderer.$inject = [ 'config.textRenderer' ];
