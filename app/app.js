import './app.css';

import createToolbar, {
  LOAD_ICON,
  SAVE_ICON,
  CENTER_ICON
} from 'bpmn-js-toolbar';

import { DIAGRAM_TYPES, UmlModeler, UmlModdle } from '../lib/uml.js';

import stateMachinePreviewXML from './previews/state-machine.uml?raw';
import componentPreviewXML from './previews/component.uml?raw';

// small models shown on the start screen, by diagram type
const PREVIEWS = {
  'state-machine': stateMachinePreviewXML,
  'component': componentPreviewXML
};

const PICKER_ID = 'uml-js';
const UML_TYPES = [ { description: 'UML model', accept: { 'application/xml': [ '.uml', '.xmi', '.xml' ] } } ];

const canvasElement = document.querySelector('#canvas');
const startScreen = document.querySelector('#start');
const viewsNav = document.querySelector('#views');

const modeler = new UmlModeler({ container: canvasElement });

let fileName = 'diagram';

modeler.on('views.changed', ({ views, activeView }) => {
  viewsNav.innerHTML = '';
  viewsNav.hidden = views.length < 2;

  for (const view of views) {
    const button = document.createElement('button');

    button.textContent = view.name;
    button.classList.toggle('active', view === activeView);
    button.addEventListener('click', () => modeler.open(view));

    viewsNav.appendChild(button);
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

    center();

    toolbar.setFileName(fileName);
    setModelButtonsEnabled(true);
  } catch (error) {
    console.error(`failed to open ${ name }`, error);
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
 * A click opens a new, empty diagram of the type.
 */
async function createStartScreen() {
  const tiles = startScreen.querySelector('.tiles');

  for (const diagramType of DIAGRAM_TYPES) {
    const tile = document.createElement('button');

    tile.className = 'tile';
    tile.dataset.type = diagramType.id;
    tile.innerHTML = `<div class="preview"></div><span class="name">${ diagramType.name }</span>`;
    tile.addEventListener('click', () => openXML(diagramType.createXML(), `${ diagramType.id }.uml`));

    tiles.appendChild(tile);

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
 * The on-canvas file and view toolbar of the BPMN workbench. It is handed a
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
    'center': { icon: CENTER_ICON, title: 'Center', action: center }
  },
  configurations: {
    uml: [ 'load', 'save', 'export', 'center', 'zoom-in', 'zoom-out' ]
  },
  configuration: 'uml'
});

setModelButtonsEnabled(false);

// shown where bpmn-js shows its bpmn.io logo
const watermark = document.createElement('span');

watermark.className = 'watermark';
watermark.textContent = 'UML.js';

toolbar.element.appendChild(watermark);

function setModelButtonsEnabled(enabled) {
  for (const button of toolbar.element.querySelectorAll('button')) {
    if (button.dataset.action !== 'load') {
      button.disabled = !enabled;
    }
  }
}

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


// drag and drop, deep linking //////////

document.body.addEventListener('dragover', event => event.preventDefault());

document.body.addEventListener('drop', async (event) => {
  event.preventDefault();

  const file = event.dataTransfer.files[0];

  if (file) {
    openXML(await file.text(), file.name);
  }
});

// for debugging
window.modeler = modeler;

createStartScreen().then(async () => {

  // optional deep linking, as in the BPMN workbench: ?src=<url> opens a model on startup
  const src = new URL(window.location.href).searchParams.get('src');

  if (!src) {
    return;
  }

  const response = await fetch(src);

  if (response.ok) {
    await openXML(await response.text(), src.split('/').pop());
  } else {
    console.error(`failed to load ${ src }: ${ response.status }`);
  }
});
