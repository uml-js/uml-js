import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate
} from 'tiny-svg';

/**
 * Text with inline math, written as TeX between dollar signs, e.g.
 * `x := $\sqrt{a^2 + b^2}$`. Prices like `500$` stay text, see #parse;
 * `\$` stands for a dollar sign.
 *
 * Math is rendered by MathJax, which is loaded once text with math is
 * shown. Until then, such text is rendered as it is written.
 */

/**
 * Height of an ex, relative to the font size, as MathJax assumes.
 */
const EX = 0.5;

let tex2svg = null;
let loading = null;

/**
 * @param {string} text
 *
 * @return {boolean} whether the text contains math
 */
export function hasMath(text) {
  return parse(text).some(line => line.some(run => run.math));
}

/**
 * @return {boolean} whether math can be rendered (MathJax is loaded)
 */
export function isMathReady() {
  return !!tex2svg;
}

/**
 * Load MathJax.
 *
 * @return {Promise<void>}
 */
export function loadMath() {
  if (!loading) {
    loading = import('./mathjax.js').then(module => {
      tex2svg = module.tex2svg;
    });
  }

  return loading;
}

/**
 * Split text into lines of text and math runs.
 *
 * A dollar sign opens math if it is followed by a non-space character and
 * does not follow a letter or digit; it closes math if it follows a
 * non-space character and is not followed by a letter or digit. So prices
 * (`500$`, `$5 to $10`) stay text without escaping. Other dollar signs, and
 * escaped ones (`\$`), are text.
 *
 * @param {string} text
 *
 * @return {Array<Array<{ text: string, math: boolean }>>}
 */
export function parse(text) {
  return text.split(/\r?\n/).map(parseLine);
}

function parseLine(line) {
  const runs = [];

  let text = '';
  let i = 0;

  const pushText = () => {
    if (text) {
      runs.push({ text, math: false });
      text = '';
    }
  };

  while (i < line.length) {
    const char = line[i];

    if (char === '\\' && line[i + 1] === '$') {
      text += '$';
      i += 2;
      continue;
    }

    if (char === '$' && canOpen(line, i)) {
      const end = findClose(line, i);

      if (end !== -1) {
        pushText();
        runs.push({ text: line.slice(i + 1, end), math: true });
        i = end + 1;
        continue;
      }
    }

    text += char;
    i++;
  }

  pushText();

  return runs;
}

/**
 * The index of the dollar sign closing math opened at the given index, or -1.
 * A dollar sign that can open, but not close, math opens instead (e.g. `$5 to $x$`),
 * so the opening at the given index fails.
 */
function findClose(line, start) {
  for (let i = start + 1; i < line.length; i++) {
    if (line[i] === '\\') {
      i++;
      continue;
    }

    if (line[i] !== '$') {
      continue;
    }

    if (i > start + 1 && canClose(line, i)) {
      return i;
    }

    if (canOpen(line, i)) {
      return -1;
    }
  }

  return -1;
}

function canOpen(line, i) {
  const next = line[i + 1];
  const previous = line[i - 1];

  return !!next && !/\s/.test(next) && !(previous && /[\p{L}\p{N}]/u.test(previous));
}

function canClose(line, i) {
  const next = line[i + 1];
  const previous = line[i - 1];

  return !/\s/.test(previous) && !(next && /[\p{L}\p{N}]/u.test(next));
}

/**
 * Lay out text with math, as diagram-js Text#layoutText does for text.
 *
 * @param {string} text
 * @param {Object} options
 * @param {Object} options.box `{ width, height }`
 * @param {string} [options.align] e.g. `center-middle`
 * @param {number|Object} [options.padding]
 * @param {boolean} [options.fitBox]
 * @param {Object} options.style `{ fontFamily, fontSize, fontWeight, lineHeight }`
 *
 * @return { { element: SVGElement, dimensions: { width: number, height: number } } }
 */
export function layoutMathText(text, options) {
  const style = options.style;
  const fontSize = parseFloat(style.fontSize) || 12;
  const lineHeight = (style.lineHeight || 1.2) * fontSize;
  const exSize = EX * fontSize;

  const padding = getPadding(options.padding);
  const [ horizontal, vertical ] = (options.align || 'center-top').split('-');

  const box = options.box || {};
  const maxWidth = (box.width || Infinity) - padding.left - padding.right;

  const lines = wrap(parse(text), maxWidth, style, exSize);

  // vertical metrics: text sits on the baseline, math may extend it
  lines.forEach(line => {
    line.ascent = Math.max(lineHeight * 0.8, ...line.items.filter(i => i.math).map(i => i.height - i.depth));
    line.descent = Math.max(lineHeight * 0.2, ...line.items.filter(i => i.math).map(i => i.depth));
  });

  const contentWidth = Math.max(0, ...lines.map(line => line.width));
  const contentHeight = lines.reduce((sum, line) => sum + line.ascent + line.descent, 0);

  const alignWidth = options.fitBox || !isFinite(maxWidth) ? contentWidth : maxWidth;

  let y = vertical === 'middle'
    ? ((box.height || contentHeight) - contentHeight) / 2
    : padding.top;

  const group = svgCreate('g');

  svgAttr(group, {
    fill: style.fill,
    color: style.fill
  });

  for (const line of lines) {
    let x = padding.left;

    if (horizontal === 'center') {
      x += (alignWidth - line.width) / 2;
    } else if (horizontal === 'right') {
      x += alignWidth - line.width;
    }

    const baseline = y + line.ascent;

    for (const item of line.items) {
      if (item.math) {
        const svg = item.svg.cloneNode(true);

        svgAttr(svg, {
          x,
          y: baseline - (item.height - item.depth),
          width: item.width,
          height: item.height
        });

        svgAppend(group, svg);
      } else {
        const textElement = svgCreate('text');

        svgAttr(textElement, {
          x,
          y: baseline,
          'font-family': style.fontFamily,
          'font-size': fontSize,
          'font-weight': style.fontWeight || 'normal'
        });

        textElement.textContent = item.text;

        svgAppend(group, textElement);
      }

      x += item.width;
    }

    y += line.ascent + line.descent;
  }

  return {
    element: group,
    dimensions: {
      width: Math.ceil(contentWidth + padding.left + padding.right),
      height: Math.ceil(contentHeight + padding.top + padding.bottom)
    }
  };
}


// helpers //////////

/**
 * Break lines into items (words, spaces, math) and wrap them at the given width.
 */
function wrap(lines, maxWidth, style, exSize) {
  const result = [];

  for (const runs of lines) {
    const items = runs.flatMap(run => {
      if (run.math) {
        return [ renderMath(run.text, exSize) ];
      }

      return run.text.split(/(\s+)/).filter(Boolean).map(word => ({
        text: word,
        space: /^\s+$/.test(word),
        width: measureText(word, style)
      }));
    });

    let line = { items: [], width: 0 };

    for (const item of items) {
      if (line.items.length && line.width + item.width > maxWidth && !item.space) {
        result.push(trim(line));
        line = { items: [], width: 0 };
      }

      if (item.space && !line.items.length) {
        continue;
      }

      line.items.push(item);
      line.width += item.width;
    }

    result.push(trim(line));
  }

  return result;
}

function trim(line) {
  while (line.items.length && line.items[line.items.length - 1].space) {
    line.width -= line.items.pop().width;
  }

  return line;
}

const mathCache = new Map();

function renderMath(tex, exSize) {
  if (!mathCache.has(tex)) {
    const container = document.createElement('div');

    container.innerHTML = tex2svg(tex);

    const svg = container.querySelector('svg');

    const ex = attr => parseFloat(svg.getAttribute(attr)) || 0;
    const verticalAlign = /vertical-align:\s*(-?[\d.]+)ex/.exec(svg.getAttribute('style') || '');

    mathCache.set(tex, {
      svg,
      width: ex('width'),
      height: ex('height'),
      depth: verticalAlign ? -parseFloat(verticalAlign[1]) : 0
    });
  }

  const { svg, width, height, depth } = mathCache.get(tex);

  return {
    math: true,
    svg,
    width: width * exSize,
    height: height * exSize,
    depth: depth * exSize
  };
}

let measureElement = null;

function measureText(text, style) {
  if (!measureElement) {
    const svg = svgCreate('svg');

    svgAttr(svg, { style: 'position: absolute; visibility: hidden; width: 0; height: 0; overflow: hidden' });

    measureElement = svgCreate('text');

    svgAppend(svg, measureElement);
    document.body.appendChild(svg);
  }

  svgAttr(measureElement, {
    'font-family': style.fontFamily,
    'font-size': parseFloat(style.fontSize) || 12,
    'font-weight': style.fontWeight || 'normal'
  });

  measureElement.textContent = text.replace(/ /g, ' ');

  return measureElement.getComputedTextLength();
}

function getPadding(padding) {
  if (typeof padding === 'number' || padding === undefined) {
    const value = padding || 0;

    return { top: value, right: value, bottom: value, left: value };
  }

  return { top: 0, right: 0, bottom: 0, left: 0, ...padding };
}
