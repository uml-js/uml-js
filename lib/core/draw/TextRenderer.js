import { assign } from 'min-dash';

import { attr as svgAttr } from 'tiny-svg';

import TextUtil from 'diagram-js/lib/util/Text.js';

import { hasMath, isMathReady, layoutMathText, loadMath } from './MathText.js';

const DEFAULT_FONT_SIZE = 12;
const LINE_HEIGHT_RATIO = 1.2;

const MIN_EXTERNAL_LABEL_WIDTH = 30;
const MAX_EXTERNAL_LABEL_WIDTH = 200;

// how much wider than its bounds an external label may be before it wraps, as the bounds
// may have been measured with a narrower font than the one at hand, e.g. Arial vs. Roboto
const EXTERNAL_LABEL_WIDTH_BUFFER = 0.2;


/**
 * Renders and measures text, shared by all UML diagram types.
 *
 * Text may contain inline math between dollar signs, see ./MathText.js.
 * MathJax is loaded with the first such text, then the diagram is redrawn.
 *
 * @param {Object} [config]
 * @param {EventBus} eventBus
 * @param {ElementRegistry} elementRegistry
 */
export default function TextRenderer(config, eventBus, elementRegistry) {

  const defaultStyle = assign({
    fontFamily: 'Arial, sans-serif',
    fontSize: DEFAULT_FONT_SIZE,
    fontWeight: 'normal',
    lineHeight: LINE_HEIGHT_RATIO
  }, config && config.defaultStyle || {});

  const textUtil = new TextUtil({
    style: defaultStyle
  });

  let mathRequested = false;

  /**
   * @return {boolean} whether text is to be laid out with math
   */
  function useMath(text) {
    if (!text || !hasMath(text)) {
      return false;
    }

    if (isMathReady()) {
      return true;
    }

    if (!mathRequested) {
      mathRequested = true;

      loadMath().then(() => {
        eventBus.fire('elements.changed', {
          elements: elementRegistry.filter(element => element.parent)
        });
      });
    }

    return false;
  }

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
    const measure = useMath(text)
      ? (t, options) => layoutMathText(t, options).dimensions
      : (t, options) => textUtil.getDimensions(unescape(t), options);

    const dimensions = measure(text || ' ', {
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
   * @param {string} text a single line
   * @param {Object} [style] overriding the default style, e.g. `{ fontWeight: 'bold' }`
   *
   * @return {number} the width of the text, not wrapped
   */
  this.getTextWidth = function(text, style = {}) {
    const measure = useMath(text)
      ? (t, options) => layoutMathText(t, options).dimensions
      : (t, options) => textUtil.getDimensions(unescape(t), options);

    return Math.ceil(measure(text || ' ', {
      box: { width: 10000, height: 30 },
      style: assign({}, defaultStyle, style),
      padding: 0
    }).width);
  };

  /**
   * @param {string} text
   * @param {Object} options see diagram-js/lib/util/Text#createText, with
   *   `externalLabel: true` for a label positioned freely on the canvas, which
   *   wraps only beyond its box widened by EXTERNAL_LABEL_WIDTH_BUFFER and is
   *   kept centered on its box, also if smaller or larger, e.g. as stored
   *
   * @return {SVGElement}
   */
  this.createText = function(text, options) {
    const { externalLabel, ...rest } = options || {};

    options = assign({ style: defaultStyle }, rest);

    if (!externalLabel) {
      return layoutText(text, options).element;
    }

    const { width, height } = options.box;

    // laid out as wide as its widest line, then centered on the box
    const { element, dimensions } = layoutText(text, assign({}, options, {
      box: assign({}, options.box, { width: width * (1 + EXTERNAL_LABEL_WIDTH_BUFFER) }),
      fitBox: true
    }));

    const dx = (width - dimensions.width) / 2;
    const dy = height ? Math.max(0, (height - dimensions.height) / 2) : 0;

    if (dx || dy) {
      svgAttr(element, 'transform', `translate(${ dx }, ${ dy })`);
    }

    return element;
  };

  /**
   * @return { { element: SVGElement, dimensions: { width: number, height: number } } }
   */
  function layoutText(text, options) {
    if (useMath(text)) {
      return layoutMathText(text, assign({}, options, { style: assign({}, defaultStyle, options.style) }));
    }

    return textUtil.layoutText(unescape(text), options);
  }

  this.getDefaultStyle = function() {
    return defaultStyle;
  };
}

/**
 * Text without math shows escaped dollar signs (`\$`) as dollar signs.
 */
function unescape(text) {
  return text.replace(/\\\$/g, '$');
}

TextRenderer.$inject = [
  'config.textRenderer',
  'eventBus',
  'elementRegistry'
];
