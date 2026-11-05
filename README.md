# UML.js

A web-based modeler for UML diagrams with math support via [MathJax](https://www.mathjax.org). Models are stored as **UML 2.5.1 XMI**, with the
diagram layout as **UML DI** in the same file, so that a `.uml` file holds both the model
and its diagrams.

Try it at https://uml-js.github.io/uml-js/.


## Supported diagram types

| Diagram type | Category | UML DI | Supported | Example |
|---|---|---|:---:|---|
| Class | Structure | `UMLClassDiagram` | ✓ | [bank.uml](https://uml-js.github.io/uml-js/?src=examples/class/bank.uml) |
| Object | Structure | `UMLObjectDiagram` | | |
| Package | Structure | `UMLPackageDiagram` | ✓ | [shop.uml](https://uml-js.github.io/uml-js/?src=examples/package/shop.uml) |
| Component | Structure | `UMLComponentDiagram` | ✓ | [webshop.uml](https://uml-js.github.io/uml-js/?src=examples/component/webshop.uml) |
| Composite structure | Structure | `UMLCompositeStructureDiagram` | | |
| Deployment | Structure | `UMLDeploymentDiagram` | ✓ | [shop.uml](https://uml-js.github.io/uml-js/?src=examples/deployment/shop.uml) |
| Profile | Structure | `UMLProfileDiagram` | | |
| Use case | Behavior | `UMLUseCaseDiagram` | ✓ | [shop.uml](https://uml-js.github.io/uml-js/?src=examples/use-case/shop.uml) |
| Activity | Behavior | `UMLActivityDiagram` | ✓ | [order.uml](https://uml-js.github.io/uml-js/?src=examples/activity/order.uml) |
| State machine | Behavior | `UMLStateMachineDiagram` | ✓ | [door.uml](https://uml-js.github.io/uml-js/?src=examples/state-machine/door.uml) |
| Sequence | Interaction | `UMLInteractionDiagram` (kind `sequence`) | ✓ | [login.uml](https://uml-js.github.io/uml-js/?src=examples/sequence/login.uml) |
| Communication | Interaction | `UMLInteractionDiagram` (kind `communication`) | | |
| Interaction overview | Interaction | `UMLInteractionDiagram` (kind `overview`) | | |
| Timing | Interaction | `UMLInteractionDiagram` (kind `timing`) | | |

All diagrams of a file share one model. Model elements and diagrams of unsupported types are
kept when a file is saved.

Names, guards, triggers and other text may contain inline math in TeX between dollar signs,
e.g. `[$n \geq 3$]`. Prices like `500$` or `$5 to $10` stay text; `\$` is a dollar sign.
Text wraps at spaces only, so that math stays on the line of the text written against it,
e.g. the comma in `$c_k$, then`.

Notes can be added to all diagrams. A note grows to fit its text when the text is edited or the
note is resized; it does not shrink by itself, and its size as read from a file is kept.

In sequence diagrams, messages are kept below the guards of the operands they are drawn in,
together with their names.

In class diagrams, the replace menu (wrench) of a relationship changes its kind and lists the
current kind, marked. Aggregations and compositions are offered with the diamond at either
classifier, named after both, e.g. *Composition: Bank owns Account*. *Reverse direction* reverses
generalizations, interface realizations and dependencies, where the reversed relationship is
allowed, and moves the diamond of aggregations and compositions to the other classifier.

Association ends may be qualified (UML 2.5.1, 11.5.4): their qualifiers are shown in a box
attached to the classifier at the end, and the multiplicity at the other end counts the instances
per value of the qualifiers. *Add qualifier at …* in the replace menu adds a box and opens it for
editing; the qualifiers are written as `name: Type`, separated by commas, and edited by
double-clicking the box. Emptying the box or *Remove qualifiers at …* removes them. Types of
qualifiers are looked up like those of attributes. The name and multiplicity of an end are edited by
double-clicking its label or the line near the end, whose text may also start with the qualifiers
between brackets, e.g. `[number: String] accounts 0..1`.

Activity diagrams show actions, call behavior actions, structured activity nodes and expansion
regions, control nodes, object nodes, partitions and interruptible regions:

* Pins are attached to the border of actions, expansion nodes to the border of expansion
  regions. Expansion nodes on the bottom or right of their region are outputs when created,
  others inputs; the replace menu changes inputs into outputs and back, and the mode of
  expansion regions.
* Flows are object flows where a pin, central buffer, data store or expansion node is involved,
  control flows otherwise. Objects enter input pins and leave output pins, and also leave input
  pins and enter output pins of structured activity nodes, from and to their content.
* Partitions (swimlanes) and interruptible regions group the nodes whose middle they contain,
  partitions also the flows between them. They are drawn behind the nodes, are selected at
  their border and the header of partitions, and move without the nodes they group. Partitions
  wider than high are horizontal, with their header at the left.
* Flows leaving an interruptible region are marked as interrupting it in the replace menu.


## XMI

* Files are written as XMI 2.5.1 with the UML 2.5.1 and UML DI namespaces, wrapped in
  `<xmi:XMI>`.
* Files using older OMG namespaces and Eclipse UML2 (Papyrus) `.uml` model files can be read.
* Elements and attributes outside the supported part of the UML meta-model are kept and
  written back unchanged.


## Usage

The moddle, which reads and writes XMI, also runs in Node without a bundler:

```js
import UmlModdle from '@uml-js/uml-js/moddle';

const moddle = new UmlModdle();

const { document, warnings } = await moddle.fromXML(xml);
const { xml: written } = await moddle.toXML(document);
```

```js
import { UmlModeler } from 'uml-js/lib/uml.js';
import 'diagram-js/assets/diagram-js.css';

const modeler = new UmlModeler({ container: '#canvas' });

await modeler.importXML(xml);              // opens the first diagram

modeler.getViews();                        // the diagrams in the file
await modeler.open(modeler.getViews()[1]);

await modeler.drillDown(activity);         // a diagram of e.g. a called activity, created if missing
modeler.getPath();                         // the diagrams drilled down into

const { xml } = await modeler.saveXML();
const { svg } = await modeler.saveSVG();   // the diagram shown
```

Use `UmlViewer` to show diagrams read-only, e.g. to embed them in a page:

```js
import { UmlViewer } from 'uml-js/lib/uml.js';
import 'diagram-js/assets/diagram-js.css';

const viewer = new UmlViewer({ container: '#canvas' });

await viewer.importXML(xml);               // shows the first diagram

await viewer.open(viewer.getViews()[1]);   // shows another diagram

const { svg } = await viewer.saveSVG();    // the diagram shown
```

The viewer has no palette, context pad or editing, but diagrams can be panned and zoomed, and
the drill-down buttons of e.g. submachine states and call behavior actions open the diagrams
they refer to.

Deleting a view with `modeler.deleteView(view)` removes its diagram. The model elements it shows are kept, with one exception: a state machine or activity that was shown by the diagram is left out when saving if by then nothing else refers to it or to anything it contains, since it could otherwise neither be seen nor reached. It stays in the model until then, so that undoing any change restores a consistent model and a saved file has no dangling references.


## Development

```sh
npm install
npm run dev     # app at http://localhost:5173
npm test
```

Example models are in `examples/`, one folder per diagram type. `?src=<url>` opens a model on startup, e.g.
http://localhost:5173/?src=/examples/sequence/login.uml.


## Acknowledgements

UML.js is built on [diagram-js](https://github.com/bpmn-io/diagram-js).


## License

MIT, see [LICENSE](LICENSE).
