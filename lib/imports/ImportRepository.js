'use babel';

import { getImportsForEntireFileContent } from '../ast/AstProvider.js'

const _ = require('lodash');
const path = require('path');

const FILE_SUFFIX_REGEXP = /\.[^/.]+$/;

export default class ImportRepository {

  constructor(importOrganiser) {
    this.changeCb = function() {};
    this.activeObserveChange = null;
    this.importOrganiser = importOrganiser;
    this.imports = null;
    this.suggested = false;
  }

  observeChanges(editor) {
    // We can observe just one editor instance at time
    this.disposeIfNecessary();

    // There is a need for versioning of the textbuffer
    // so that the only last change is not being ignored
    this.version = 0;

    this.activeObserveChange = editor.getBuffer().onDidStopChanging((ev) => {
      this.version++;

      // We don't wanna observe change in buffer if the change is caused by Organiser
      if (!this.importOrganiser.isOrganising()) {
        getImportsForEntireFileContent(editor.getBuffer().getText(), this.version).then((data) => {
          if (this.version === data.version) {
            if (!this.suggested) {
              if (this.imports === null) {
                this.imports = data.imports;
              } else {
                if (!_.eq(this.imports, data.imports)) {
                  this.imports = data.imports;
                  this.changeCb(this.imports);
                }
              }
            } else {
              this.suggested = false;
            }
          }
        });
      } else {
        this.suggested = false;
      }
    });
  }

  // TODO: this is not ideal as one might compare
  // file.react.js vs file.react
  getFileNameWithoutExtension(fileName) {
    if (fileName.indexOf('.') !== -1) {
      return fileName.replace(FILE_SUFFIX_REGEXP, '');
    } else {
      return fileName;
    }
  }

  getFileInFolder(file) {
    // file is not starting with ../something or ./something
    // so it's most likely something.js
    if (file[0] !== '.') {
      return './' + file;
    } else {
      return file;
    }
  }

  pushSuggestedImport(suggestedImport, currentlyEditedFilePath) {
    const suggestedImportFile = path.relative(path.dirname(currentlyEditedFilePath), suggestedImport.file);

    // we don't want to import anything from currently opened file
    if (suggestedImportFile !== path.basename(currentlyEditedFilePath))  {
      const suggestedFileInFolder = this.getFileInFolder(suggestedImportFile);
      const existingImportFileIndex = _.findIndex(this.imports, (singleImport) => {
        return this.getFileNameWithoutExtension(singleImport.file) ===
               this.getFileNameWithoutExtension(suggestedFileInFolder);
      });

      if (existingImportFileIndex !== -1) {
        if (!_.contains(_.pluck(this.imports[existingImportFileIndex].specifiers, 'textImported'), suggestedImport.text)) {
          this.imports[existingImportFileIndex].specifiers.push({
            textLocal: suggestedImport.text,
            textImported: suggestedImport.text,
            def: suggestedImport.def
          });
          this.changeCb(this.imports);
          this.suggested = true;
        }
      } else {
        this.imports.push({
          file: suggestedFileInFolder,
          def: suggestedImport.def,
          specifiers: [{
            textLocal: suggestedImport.text,
            textImported: suggestedImport.text,
            def: suggestedImport.def
          }]
        });
        this.changeCb(this.imports);
        this.suggested = true;
      }
    }
  }

  registerChange(cb) {
    this.changeCb = cb;
  }

  disposeIfNecessary() {
    if (this.activeObserveChange) {
      this.activeObserveChange.dispose();
    }
  }
}
