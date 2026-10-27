/**
 * TeX to SVG via MathJax (https://www.mathjax.org), loaded on demand
 * by ./MathText.js as it is large.
 */
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

import 'mathjax-full/js/input/tex/base/BaseConfiguration.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';

const adaptor = liteAdaptor();

RegisterHTMLHandler(adaptor);

const document = mathjax.document('', {
  InputJax: new TeX({ packages: [ 'base', 'ams' ] }),

  // paths in place rather than references to a font cache, so that math survives SVG export
  OutputJax: new SVG({ fontCache: 'none' })
});

/**
 * @param {string} tex
 *
 * @return {string} SVG markup, sized in ex
 */
export function tex2svg(tex) {
  const node = document.convert(tex, { display: false });

  return adaptor.innerHTML(node);
}
