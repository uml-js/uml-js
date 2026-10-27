# uml-js

A [bpmn-js](https://github.com/bpmn-io/bpmn-js) like editor for UML diagrams, built on
[diagram-js](https://github.com/bpmn-io/diagram-js). Files are **UML 2.5.1 XMI** containing
both the model and its **UML DI** (diagram interchange), just like a `.bpmn` file contains
BPMN and BPMN DI.

Supported diagram types:

| Diagram type | UML DI | Status |
|---|---|---|
| State machine | `umldi:UMLStateMachineDiagram` | viewer + modeller |
| Component | `umldi:UMLComponentDiagram` | viewer + modeller |


Try it at https://uml-js.github.io/uml-js/ (deployed by `.github/workflows/deploy.yml` on
every push to `main`), e.g. https://uml-js.github.io/uml-js/?src=examples/webshop.uml.


## Usage

```js
import { UmlModeler } from 'uml-js/lib/uml.js';
import 'diagram-js/assets/diagram-js.css';

const modeler = new UmlModeler({ container: '#canvas' });

await modeler.importXML(xml);        // opens the first diagram

modeler.getViews();                  // all diagrams in the file
await modeler.open(modeler.getViews()[0]);

modeler.getActiveViewer();           // the diagram-js based (state machine) modeller

const { xml } = await modeler.saveXML();
```

Use `UmlViewer` for read-only display.


## Development

```sh
npm install
npm run dev     # demo app at http://localhost:5173
npm test        # XMI and label notation tests
```


The demo app starts with a tile per diagram type, each previewing a small model; a click
opens a new diagram of that type. It uses the on-canvas toolbar of the BPMN workbench
([bpmn-js-toolbar](https://github.com/bpmn-os/bpmn-js-toolbar)) for load, save, SVG export,
centering and zooming; `UmlModeler#saveSVG` exports the diagram shown. Example models are in
`examples/`, `?src=<url>` opens a model on startup, e.g.
`http://localhost:5173/?src=/examples/webshop.uml`.


## Structure

```
lib/
  uml.js                    entry: reads the file, branches per diagram type
  moddle/                   UML, UMLDI, DC, DI meta-model + XMI reader / writer (shared)
  core/                     shared diagram-js code: base viewer / modeller, DI importer,
                            DI updater, orthogonal layout, ordering, replace menu,
                            keyboard bindings, auto place, text rendering, icons
  state-machine/
    viewer.js               StateMachineViewer
    modeller.js             StateMachineModeler
    draw/ modeling/ rules/ palette/ context-pad/ label-editing/ ...
  component/
    viewer.js               ComponentViewer
    modeller.js             ComponentModeler
    draw/ modeling/ rules/ palette/ context-pad/ label-editing/ ...
```

All diagram types share one model (`lib/moddle`). The entry point creates one
viewer / modeller per diagram and redraws a diagram when switching to it, so changes made
in one diagram show up in the others.

To add a diagram type, create `lib/{diagram-type}/viewer.js`, `modeller.js` (extending
`core/BaseViewer` / `core/BaseModeler`) and `new-diagram.js`, extend the meta-model in
`lib/moddle/resources` and register the type in `DIAGRAM_TYPES` in `lib/uml.js`. The demo app
shows a tile for it once a preview model is added to `app/previews`.


## State machine diagrams

Elements: states (simple and composite), final states, pseudostates (initial, choice,
junction, fork, join, shallow / deep history, terminate) and transitions.

* Transitions are routed orthogonally, like sequence flows in bpmn-js: drag a segment's
  middle to move it, drag elsewhere on a transition to add a bendpoint.
* Drop vertices into a state to make it composite; they are placed in the state's region.
* Transitions are owned by the innermost region containing source and target.
* Like in bpmn-js, the context pad appends one representative per class of vertices
  (final state, state, choice, fork / join, history). Use the replace menu (wrench, `R`) to
  change the type within a class: final state ↔ terminate, choice ↔ junction,
  shallow ↔ deep history, and to
  switch states between simple and composite (title / content compartments).
* Fork and join are a single element: whether it is a fork or a join is derived from its
  transitions (one in / several out: fork, several in / one out: join).
* Double click (or `E`) to edit:
  * states: name on the first line, then `entry / ...`, `do / ...`, `exit / ...`
  * transitions: `trigger1, trigger2 [guard] / effect`
* Guards are `uml:Constraint`s with an `uml:OpaqueExpression` (owned via `ownedRule`),
  effects and state activities are `uml:OpaqueBehavior`s.


## Component diagrams

Elements: components (nestable), interfaces, ports, interface realizations, usages,
dependencies and connectors.

* Components and interfaces are packaged in the package shown by the diagram or in the
  component they are drawn in.
* Ports are dropped on a component's border (or added via the context pad). They slide along
  the border, also around corners, and are owned attributes of the component.
* Provided and required interfaces in ball-and-socket notation:
  * `-O` in a component's context pad appends a ball (interface with `isIcon` in UML DI)
    realized by the component, drawn as lollipop.
  * `-C` connects the component to a ball that is provided by another component, as usage
    drawn as socket. Only provided balls can be targets.
  * From a ball, append a component that provides it (if nobody does yet) or requires it.
  * Ports have `-O` and `-C`, too. A port shows (at most) one interface as its type: typed
    by an interface, it provides it; conjugated (`isConjugated`), it requires it. The wrench
    switches between both. The line is UML DI of the port (an edge with the port as model
    element).
* Connecting picks the relationship from what is connected: component → interface is an
  interface realization (a usage for balls that are provided already), other classifiers get
  a dependency, ports get a connector. Connections can start at either end. Use the wrench
  to change between interface realization, usage and dependency, or between ball and
  rectangle notation of interfaces.
* Connection ends can be moved wherever a new connection could be created. Where the kind of
  connection does not fit the new ends, it is replaced: e.g. a usage moved from a component's
  border to one of its ports becomes the port requiring the interface, and vice versa.
* Relationships can be named (double click or `E`), dashed usages show `«use»`.
* Connectors are owned by the innermost component containing both ports. Ports of
  top-level components cannot be connected, as a connector needs a component as context.


## XMI

* Written as XMI 2.5.1 with UML 2.5.1 / UML DI namespaces, wrapped in `<xmi:XMI>`.
* Reads older OMG namespaces and Eclipse UML2 (Papyrus) `.uml` model files.
* Elements and attributes outside the supported meta-model subset are kept and written
  back unchanged.


## Icons

Icons are taken from [bpmn-font](https://github.com/bpmn-io/bpmn-font) (SIL Open Font
License 1.1) where a BPMN counterpart exists, and drawn in the same style otherwise. Run
`node scripts/extract-bpmn-font-icons.mjs` to regenerate `lib/core/icons/bpmn-font.js`.


## Known limitations

* Only the part of the UML meta-model needed for state machine and component diagrams is
  defined; everything else is preserved but not editable.
* Component diagrams: no parts (properties typed by components), so connector ends do not
  set `partWithPort`; ports provide or require one interface at most (no classes as port
  types); no component realizations, artifacts or packages.
* Triggers are stored by name; no `uml:Event`s are created for them (`Trigger::event` is
  left empty).
* Not supported yet: orthogonal regions (states with more than one region), entry / exit
  points, submachine states, self transitions, copy / paste.
* Layout from other tools: Papyrus stores diagrams in a separate GMF `.notation` file, not
  UML DI, so Papyrus models open without diagrams.
