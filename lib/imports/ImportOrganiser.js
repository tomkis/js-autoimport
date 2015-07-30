'use babel';

const _ = require('lodash');

const IMPORT_REGEXP = /^import(.|\n)*?from(.)*\n/gm;
const NEW_LINES_BETWEEN_IMPORTS = /from(.)+\n(\n)+import/gm;
const REPLACE_PLACEHOLDER = '@replaceMe@';
const REPLACE_PLACEHOLDER_REGEXP = new RegExp(REPLACE_PLACEHOLDER + '(.)*' + REPLACE_PLACEHOLDER, 'gm');

const LIBRARY_IMPORT = 0;
const PROJECT_IMPORT = 1;

export default class ImportOrganiser {

  setEditor(editor) {
    this.editor = editor;
    this.buffer = editor.getBuffer();
  }

  groupByLibraryImport(singleImport) {
    if (singleImport.file[0] === '.') {
      return PROJECT_IMPORT;
    } else {
      return LIBRARY_IMPORT;
    }
  }

  getNewImportsRows(imports) {
    const groupedImports = _.groupBy(imports, this.groupByLibraryImport);
    groupedImports[LIBRARY_IMPORT] = _.sortBy(groupedImports[LIBRARY_IMPORT], 'file');
    groupedImports[PROJECT_IMPORT] = _.sortBy(groupedImports[PROJECT_IMPORT], 'file');

    function renderSpecifier(specifier) {
      if (specifier.textLocal !== specifier.textImported) {
        return `${specifier.textImported} as ${specifier.textLocal}`;
      } else {
        if (specifier.textImported) {
          return specifier.textImported;
        } else {
          return '';
        }
      }
    }

    return groupedImports[LIBRARY_IMPORT]
          .concat(groupedImports[PROJECT_IMPORT])
          .map((singleImport, row) => {

            // TODO: add newlines
            if (singleImport.specifiers.length > 0) {
              const spaceForNamedImports = atom.config.get('js-autoimport.spaceForNamedImports') ? ' ' : ''
              const defaultSpecifiers = _.filter(singleImport.specifiers, (specifier) => specifier.def);
              const namedSpecifiers = _.filter(singleImport.specifiers, (specifier) => !specifier.def);
              const leftBracketWithComma = defaultSpecifiers.length === 1 ? `, {${spaceForNamedImports}` : `{${spaceForNamedImports}`;
              const leftBracket = namedSpecifiers.length > 0 ? leftBracketWithComma : spaceForNamedImports;
              const rightBracket = namedSpecifiers.length > 0 ? `${spaceForNamedImports}}` : '';
              const defaultSpecifier = defaultSpecifiers.length === 1 ? defaultSpecifiers[0] : '';
              const trailingSemicolon = atom.config.get('js-autoimport.trailingSemicolon') ? ';' : '';

              return `import ${renderSpecifier(defaultSpecifier)}${leftBracket}${namedSpecifiers.map(renderSpecifier).join(', ')}${rightBracket} from '${singleImport.file}'${trailingSemicolon}`;
            } else {
              return `import '${singleImport.file}'`;
            }
          });
  }

  organiseImports(newImports) {
    this.organising = true;

    const newImportsRows = this.getNewImportsRows(newImports);
    const bufferText = this.buffer.getText();

    if (bufferText.match(IMPORT_REGEXP)) {
      this.buffer.setTextViaDiff(
        bufferText
        .replace(NEW_LINES_BETWEEN_IMPORTS, 'from\$1\nimport')
        .replace(IMPORT_REGEXP, REPLACE_PLACEHOLDER)
        .replace(REPLACE_PLACEHOLDER_REGEXP, REPLACE_PLACEHOLDER)
        .replace(REPLACE_PLACEHOLDER, newImportsRows.length > 0 ? (newImportsRows.join('\n') + '\n') : '')
      );
    } else {
      this.buffer.setTextViaDiff(
        (newImportsRows.length > 0 ? (newImportsRows.join('\n') + '\n\n') : '') +
        bufferText
      );
    }
  }

  isOrganising() {
    if (this.organising) {
      this.organising = false;
      return true;
    } else {
      return false;
    }
  }
}
