import './app.css';

import createToolbar, {
  LOAD_ICON,
  SAVE_ICON,
  CENTER_ICON
} from 'bpmn-js-toolbar';

import { DIAGRAM_TYPES, UmlModeler, UmlModdle } from '../lib/uml.js';

import stateMachinePreviewXML from './previews/state-machine.uml?raw';
import classPreviewXML from './previews/class.uml?raw';
import componentPreviewXML from './previews/component.uml?raw';
import deploymentPreviewXML from './previews/deployment.uml?raw';
import packagePreviewXML from './previews/package.uml?raw';
import sequencePreviewXML from './previews/sequence.uml?raw';
import activityPreviewXML from './previews/activity.uml?raw';
import useCasePreviewXML from './previews/use-case.uml?raw';

// small models shown on the start screen, by diagram type
const PREVIEWS = {
  'state-machine': stateMachinePreviewXML,
  'class': classPreviewXML,
  'component': componentPreviewXML,
  'deployment': deploymentPreviewXML,
  'package': packagePreviewXML,
  'sequence': sequencePreviewXML,
  'activity': activityPreviewXML,
  'use-case': useCasePreviewXML
};

// examples, published along with the app (see .github/workflows/deploy.yml)
const EXAMPLES = {
  'state-machine': 'examples/state-machine/door.uml',
  'class': 'examples/class/bank.uml',
  'component': 'examples/component/webshop.uml',
  'deployment': 'examples/deployment/shop.uml',
  'package': 'examples/package/shop.uml',
  'sequence': 'examples/sequence/login.uml',
  'activity': 'examples/activity/order.uml',
  'use-case': 'examples/use-case/shop.uml'
};

const DISCARD_ICON = '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

const PICKER_ID = 'uml-js';
const UML_TYPES = [ { description: 'UML model', accept: { 'application/xml': [ '.uml', '.xmi', '.xml' ] } } ];

const canvasElement = document.querySelector('#canvas');
const startScreen = document.querySelector('#start');
const restoreLink = document.querySelector('#restore');
const viewsNav = document.querySelector('#views');

const modeler = new UmlModeler({ container: canvasElement });

let fileName = 'diagram';

// whether the model is discarded (see #discard), but can be restored
let discarded = false;

// diagrams shown before, which keep where they were scrolled and zoomed to
const shownViews = new WeakSet();

modeler.on('views.changed', ({ views, activeView }) => {

  // diagrams are centered when first shown, e.g. after drilling down
  if (activeView && !shownViews.has(activeView)) {
    shownViews.add(activeView);

    center();
  }

  focusCanvas();

  viewsNav.innerHTML = '';
  viewsNav.hidden = views.length < 2;

  for (const view of views) {
    const button = document.createElement('button');

    button.textContent = view.name;
    button.classList.toggle('active', view === activeView);
    button.addEventListener('click', () => modeler.open(view));

    viewsNav.appendChild(button);

    // the diagram shown can be deleted, which is undone in the diagram shown then
    if (view === activeView) {
      const deleteButton = document.createElement('button');

      deleteButton.className = 'active delete';
      deleteButton.title = 'Delete diagram';
      deleteButton.innerHTML = DISCARD_ICON;
      deleteButton.addEventListener('click', () => modeler.deleteView(view));

      viewsNav.appendChild(deleteButton);
    }
  }
});


async function openXML(xml, name) {
  try {
    const { warnings } = await modeler.importXML(xml);

    fileName = name.replace(/\.[^.]+$/, '');
    document.title = `${ fileName }.uml - UML.js`;

    if (warnings.length) {
      console.warn('import warnings', warnings);
    }

    startScreen.hidden = true;

    // a new model replaces the discarded one
    setDiscarded(false);

    center();

    toolbar.setFileName(fileName);
    setModelButtonsEnabled(true);
  } catch (error) {
    console.error(`failed to open ${ name }`, error);
  }
}

/**
 * Keyboard shortcuts, e.g. Ctrl+Z, apply to the diagram focused, which clicking
 * buttons outside of it, e.g. tabs or drill-down buttons, does not.
 */
function focusCanvas() {
  const viewer = modeler.getActiveViewer();

  if (viewer) {
    viewer.get('canvas').focus();
  }
}

function center() {
  const viewer = modeler.getActiveViewer();

  if (viewer) {
    viewer.get('canvas').zoom('fit-viewport', 'auto');
  }
}


// start screen //////////

/**
 * One tile per diagram type, previewing a small model of that type.
 * A click opens a new, empty diagram of the type, the link below
 * the tile the example of the type.
 */
async function createStartScreen() {
  const tiles = startScreen.querySelector('.tiles');

  for (const diagramType of DIAGRAM_TYPES) {
    const column = document.createElement('div');

    column.className = 'tile-column';

    const tile = document.createElement('button');

    tile.className = 'tile';
    tile.dataset.type = diagramType.id;
    tile.innerHTML = `<div class="preview"></div><span class="name">${ diagramType.name }</span>`;
    tile.addEventListener('click', () => openXML(diagramType.createXML(), 'diagram.uml'));

    column.appendChild(tile);

    const example = EXAMPLES[diagramType.id];

    if (example) {
      const link = document.createElement('a');

      link.className = 'example';
      link.href = `?src=${ example }`;
      link.textContent = 'Load example';
      link.addEventListener('click', event => {
        event.preventDefault();

        openURL(example);
      });

      column.appendChild(link);
    }

    tiles.appendChild(column);

    const xml = PREVIEWS[diagramType.id];

    if (xml) {
      await showPreview(tile.querySelector('.preview'), diagramType, xml);
    }
  }
}

async function showPreview(container, diagramType, xml) {
  const moddle = new UmlModdle();

  const { document } = await moddle.fromXML(xml);

  const diagram = document.contents.find(element => element.$instanceOf && element.$instanceOf(diagramType.diType));

  const viewer = new diagramType.Viewer({ container, moddle });

  await viewer.open(diagram);

  const canvas = viewer.get('canvas');

  // fit, leaving a margin
  canvas.zoom('fit-viewport', 'auto');
  canvas.zoom(canvas.zoom() * 0.85, 'auto');
}


// toolbar //////////

/**
 * The on-canvas file and view toolbar of the BPMN workbench, bpmn-js-toolbar
 * (https://github.com/bpmn-os/bpmn-js-toolbar). It is handed a
 * modeler-like object that delegates to the diagram shown; loading and saving
 * are replaced by versions for UML files.
 *
 * Without a model, all buttons but load are disabled.
 */
const toolbar = createToolbar({
  get: (name) => {
    const viewer = modeler.getActiveViewer();

    if (viewer) {
      return viewer.get(name);
    }

    if (name === 'canvas') {
      return { getContainer: () => canvasElement };
    }

    throw new Error('no diagram shown');
  },
  importXML: (xml) => openXML(xml, fileName),
  saveXML: (options) => modeler.saveXML(options),
  saveSVG: () => modeler.saveSVG()
}, {
  container: canvasElement,
  fileName,
  buttons: {
    'load': { icon: LOAD_ICON, title: 'Load UML model', action: load },
    'save': { icon: SAVE_ICON, title: 'Save UML model', action: save },
    'discard': { icon: DISCARD_ICON, title: 'Discard model', action: discard },
    'center': { icon: CENTER_ICON, title: 'Center', action: center }
  },
  configurations: {
    uml: [ 'load', 'save', 'export', 'center', 'zoom-in', 'zoom-out', 'discard' ]
  },
  configuration: 'uml'
});

setModelButtonsEnabled(false);

// shown where bpmn-js shows its bpmn.io logo, linking to the project
const repoLink = document.createElement('a');

repoLink.className = 'repo-link';
repoLink.textContent = 'UML.js';
repoLink.href = 'https://github.com/uml-js/uml-js';
repoLink.target = '_blank';
repoLink.rel = 'noopener';
repoLink.title = 'UML.js on GitHub';

toolbar.element.appendChild(repoLink);

function setModelButtonsEnabled(enabled) {
  for (const button of toolbar.element.querySelectorAll('button')) {
    if (button.dataset.action !== 'load') {
      button.disabled = !enabled;
    }
  }
}

/**
 * Back to the start screen. The model is kept (with the undo history of its
 * diagrams), so that it can be restored until another model is opened.
 */
function discard() {
  startScreen.hidden = false;
  viewsNav.hidden = true;

  document.title = 'UML.js';

  setModelButtonsEnabled(false);
  setDiscarded(true);
}

function restore() {
  startScreen.hidden = true;
  viewsNav.hidden = modeler.getViews().length < 2;

  document.title = `${ fileName }.uml - UML.js`;

  setModelButtonsEnabled(true);
  setDiscarded(false);
}

function setDiscarded(value) {
  discarded = value;

  restoreLink.parentNode.hidden = !discarded;
}

restoreLink.addEventListener('click', event => {
  event.preventDefault();

  if (discarded) {
    restore();
  }
});

async function load() {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [ handle ] = await window.showOpenFilePicker({ id: PICKER_ID, types: UML_TYPES });
      const file = await handle.getFile();

      await openXML(await file.text(), file.name);
    } catch (error) {
      ignoreAbort(error);
    }

    return;
  }

  const input = document.createElement('input');

  input.type = 'file';
  input.accept = '.uml,.xmi,.xml';
  input.addEventListener('change', async () => {
    const file = input.files[0];

    if (file) {
      await openXML(await file.text(), file.name);
    }
  });

  input.click();
}

async function save() {
  const { xml } = await modeler.saveXML({ format: true });

  const suggestedName = `${ fileName }.uml`;

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({ id: PICKER_ID, suggestedName, types: UML_TYPES });
      const writable = await handle.createWritable();

      await writable.write(xml);
      await writable.close();
    } catch (error) {
      ignoreAbort(error);
    }

    return;
  }

  const link = document.createElement('a');

  link.href = URL.createObjectURL(new Blob([ xml ], { type: 'application/xml' }));
  link.download = suggestedName;
  link.click();

  URL.revokeObjectURL(link.href);
}

function ignoreAbort(error) {
  if (error && error.name !== 'AbortError') {
    console.error(error);
  }
}


// small screens //////////

// disabled for now, the app behaves well enough on small and touch screens

// // windows too small for palette, toolbar and diagram
// const smallScreen = window.matchMedia('(max-width: 959px), (max-height: 599px)');
// const smallScreenNotice = document.querySelector('#small-screen');
//
// // dismissed until the page is loaded again
// let smallScreenDismissed = false;
//
// function updateSmallScreenNotice() {
//   smallScreenNotice.hidden = !smallScreen.matches || smallScreenDismissed;
// }
//
// smallScreenNotice.querySelector('button').addEventListener('click', () => {
//   smallScreenDismissed = true;
//   updateSmallScreenNotice();
// });
//
// smallScreen.addEventListener('change', updateSmallScreenNotice);
//
// updateSmallScreenNotice();


// touch //////////

/**
 * Panning with one finger and zooming with two on the diagram, which diagram-js
 * only does with a mouse. Taps still select, as the browser follows them with
 * mouse events; mouse and pen are left to diagram-js.
 */
const IGNORED_FOR_TOUCH = '.djs-palette, .djs-context-pad, .djs-popup, .djs-direct-editing-parent';

const diagramsElement = canvasElement.querySelector('.uml-js');

// position of each finger on the diagram, by pointer id
const touches = new Map();

diagramsElement.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch' || !event.target.closest('.djs-container') || event.target.closest(IGNORED_FOR_TOUCH)) {
    return;
  }

  touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
});

diagramsElement.addEventListener('pointermove', (event) => {
  const previous = touches.get(event.pointerId);
  const viewer = modeler.getActiveViewer();

  if (!previous || !viewer) {
    return;
  }

  const canvas = viewer.get('canvas');
  const current = { x: event.clientX, y: event.clientY };

  if (touches.size === 1) {
    canvas.scroll({ dx: current.x - previous.x, dy: current.y - previous.y });
  } else if (touches.size === 2) {
    const other = [ ...touches ].find(([ id ]) => id !== event.pointerId)[1];

    const previousDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
    const distance = Math.hypot(current.x - other.x, current.y - other.y);

    const rect = canvas.getContainer().getBoundingClientRect();

    const previousCenter = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
    const center = { x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 };

    canvas.scroll({ dx: center.x - previousCenter.x, dy: center.y - previousCenter.y });

    // within the zoom range of diagram-js' mouse wheel zooming
    if (previousDistance > 0) {
      const scale = Math.min(4, Math.max(0.2, canvas.zoom() * distance / previousDistance));

      canvas.zoom(scale, { x: center.x - rect.left, y: center.y - rect.top });
    }
  }

  touches.set(event.pointerId, current);
});

for (const type of [ 'pointerup', 'pointercancel' ]) {
  diagramsElement.addEventListener(type, (event) => touches.delete(event.pointerId));
}


// drag and drop, deep linking //////////

document.body.addEventListener('dragover', event => event.preventDefault());

document.body.addEventListener('drop', async (event) => {
  event.preventDefault();

  const file = event.dataTransfer.files[0];

  if (file) {
    openXML(await file.text(), file.name);
  }
});

/**
 * @param {string} url of a model
 */
async function openURL(url) {
  const response = await fetch(url);

  if (response.ok) {
    await openXML(await response.text(), url.split('/').pop());
  } else {
    console.error(`failed to load ${ url }: ${ response.status }`);
  }
}

// for debugging
window.modeler = modeler;

createStartScreen().then(async () => {

  // optional deep linking, as in the BPMN workbench: ?src=<url> opens a model on startup
  const src = new URL(window.location.href).searchParams.get('src');

  if (!src) {
    return;
  }

  await openURL(src);
});
