# UML.js

A web-based modeler for UML diagrams. Models are stored as **UML 2.5.1 XMI**, with the
diagram layout as **UML DI** in the same file, so that a `.uml` file holds both the model
and its diagrams.

Try it at https://uml-js.github.io/uml-js/.


## Supported diagram types

| Diagram type | Category | UML DI | Supported | Example |
|---|---|---|:---:|---|
| Class | Structure | `UMLClassDiagram` | | |
| Object | Structure | `UMLObjectDiagram` | | |
| Package | Structure | `UMLPackageDiagram` | | |
| Component | Structure | `UMLComponentDiagram` | ✓ | [webshop.uml](https://uml-js.github.io/uml-js/?src=examples/component/webshop.uml) |
| Composite structure | Structure | `UMLCompositeStructureDiagram` | | |
| Deployment | Structure | `UMLDeploymentDiagram` | | |
| Profile | Structure | `UMLProfileDiagram` | | |
| Use case | Behavior | `UMLUseCaseDiagram` | | |
| Activity | Behavior | `UMLActivityDiagram` | | |
| State machine | Behavior | `UMLStateMachineDiagram` | ✓ | [door.uml](https://uml-js.github.io/uml-js/?src=examples/state-machine/door.uml) |
| Sequence | Interaction | `UMLInteractionDiagram` (kind `sequence`) | ✓ | [login.uml](https://uml-js.github.io/uml-js/?src=examples/sequence/login.uml) |
| Communication | Interaction | `UMLInteractionDiagram` (kind `communication`) | | |
| Interaction overview | Interaction | `UMLInteractionDiagram` (kind `overview`) | | |
| Timing | Interaction | `UMLInteractionDiagram` (kind `timing`) | | |

All diagrams of a file share one model. Model elements and diagrams of unsupported types are
kept when a file is saved.

Names, guards, triggers and other text may contain inline math in TeX between dollar signs,
e.g. `[$n \geq 3$]`. Prices like `500$` or `$5 to $10` stay text; `\$` is a dollar sign.


## XMI

* Files are written as XMI 2.5.1 with the UML 2.5.1 and UML DI namespaces, wrapped in
  `<xmi:XMI>`.
* Files using older OMG namespaces and Eclipse UML2 (Papyrus) `.uml` model files can be read.
* Elements and attributes outside the supported part of the UML meta-model are kept and
  written back unchanged.


## Usage

```js
import { UmlModeler } from 'uml-js/lib/uml.js';
import 'diagram-js/assets/diagram-js.css';

const modeler = new UmlModeler({ container: '#canvas' });

await modeler.importXML(xml);              // opens the first diagram

modeler.getViews();                        // the diagrams in the file
await modeler.open(modeler.getViews()[1]);

const { xml } = await modeler.saveXML();
const { svg } = await modeler.saveSVG();   // the diagram shown
```

Use `UmlViewer` to show diagrams read-only.


## Development

```sh
npm install
npm run dev     # app at http://localhost:5173
npm test
```

Example models are in `examples/`, one folder per diagram type. `?src=<url>` opens a model on startup, e.g.
http://localhost:5173/?src=/examples/sequence/login.uml.


## Acknowledgements

UML.js is built on [diagram-js](https://github.com/bpmn-io/diagram-js). Math is rendered with
[MathJax](https://www.mathjax.org).


## License

MIT, see [LICENSE](LICENSE).
