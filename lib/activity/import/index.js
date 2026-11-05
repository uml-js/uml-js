import AttachImporter from './AttachImporter.js';
import LabelImporter from './LabelImporter.js';

export default {
  __init__: [ 'attachImporter', 'labelImporter' ],
  attachImporter: [ 'type', AttachImporter ],
  labelImporter: [ 'type', LabelImporter ]
};
