'use babel';

import { BufferedNodeProcess } from 'atom'
import { getExportsForFiles } from '../ast/AstProvider.js'

const finder = require('findit');
const nodePath = require('path');
const _ = require('lodash');

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
      finder(path)
        .on('directory', (dir, stat, stop) => {
          const base = nodePath.basename(dir);
          if (path !== dir && _.contains(atom.config.get('js-autoimport.ignoredFolders'), base)) {
            stop();
          }
        })
        .on('file', (file) => {
          const extname = nodePath.extname(file);
          if (_.contains(atom.config.get('js-autoimport.allowedSuffixes'), extname)) {
            files.push(file);
          }
        })
        .on('end', () => {
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
