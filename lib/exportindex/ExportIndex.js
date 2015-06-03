'use babel';

import { BufferedNodeProcess } from 'atom'
import { getExportsForFiles } from '../ast/AstProvider.js'

const walk = require('walk');
const nodePath = require('path');
const _ = require('lodash');

// TODO: make it configurable
const IGNORED_FOLDERS = ['node_modules', 'test', 'bin', 'dist'];
const ALLOWED_SUFFIX = ['js', 'jsx'];

export default class ExportIndex {

  constructor() {
    this.activeObserveChange = null;
    this.index = [];
  }

  observeChanges(editor) {
    this.disposeIfNecessary();
    this.activeObserveChange = editor.onDidSave((ev) => {
      const fileName = ev.path;

      getExportsForFiles([fileName])
        .then((indexIncrement) => {
          this.index = _.filter(this.index, (record) => record.file !== fileName);
          this.index = this.index.concat(indexIncrement);
        });
    });
  }

  disposeIfNecessary() {
    if (this.activeObserveChange) {
      this.activeObserveChange.dispose();
    }
  }

  getIndex() {
    return this.index;
  }

  buildIndex() {
    const startTime = new Date().getTime();
    const files = [];

    atom.project.getPaths().forEach((path) => {
      const walker = walk.walk(path, {
        filters: IGNORED_FOLDERS
      });
      walker.on('file', (root, file, next) => {
        const isAllowedFile = _.some(ALLOWED_SUFFIX, (suffix) => {
          return _.endsWith(file.name, suffix);
        });

        if (isAllowedFile) {
          files.push(nodePath.resolve(root, file.name));
        }
        next();
      });
      walker.on('end', () => {
        console.debug(`Traversed ${files.length} files in ${new Date().getTime() - startTime}ms`, files);

        const startIndexTime = new Date().getTime();
        getExportsForFiles(files)
          .then((index) => {
            this.index = index;
            console.debug(`Index has been obtained in ${new Date().getTime() - startIndexTime}ms`);
          });
      });
    });
  }
}
