'use babel';

import BufferedNodeProcessExecutorPool from '../utils/BufferedNodeProcessExecutorPool.js'

const Q = require('q');
const path = require('path');
const _ = require('lodash');

const EXPORT_DEFAULT = 'ExportDefaultDeclaration';
const EXPORT_NAMED = 'ExportNamedDeclaration';
const IMPORT_DEFAULT = 'ImportDefaultSpecifier';
const IMPORT_DECLARATION = 'ImportDeclaration';
const IMPORT_DEFAULT_SPECIFIER = 'ImportDefaultSpecifier';
const IMPORT_NAMESPACE_SPECIFIER = 'ImportNamespaceSpecifier';
const VARIABLE_DECLARATION = 'VariableDeclaration';
const FULFILLED_PROMISE = 'fulfilled';

const nodeProcessExecutor = new BufferedNodeProcessExecutorPool();

function callAstServer(args) {
  return nodeProcessExecutor.execute(path.resolve(__dirname, './AstServer.js'), args);
}

export function getExportsForFiles(files) {
  return Q.allSettled(files.map((file) => callAstServer([file])))
    .then((promises) => {

      promises
        .filter(response => response.state !== FULFILLED_PROMISE)
        .forEach((response) => { console.error(`Couldn't process for export index - ${response.reason.args[0]}`, response.reason); });

      return _.flatten(
        promises
          .filter(response => response.state === FULFILLED_PROMISE)
          .filter(response => response.value.data !== '')
          .map((response) => {
            const file = response.value.args[0];

            let data;
            try {
              data = JSON.parse(response.value.data);
            } catch(ex) {
              data = {body: []};
            }

            return _.flatten(data
              .body
              .filter((astRecord) => (astRecord.type === EXPORT_NAMED || astRecord.type === EXPORT_DEFAULT) && astRecord.declaration)
              .map((astRecord) => {
                if (astRecord.type === EXPORT_DEFAULT) {
                  if (!astRecord.declaration.id) {
                    const importedFileName = path.basename(file);

                    // Default export without name
                    return {
                      text: importedFileName.replace(path.extname(importedFileName), ''),
                      file: file,
                      type: astRecord.declaration.type,
                      def: true
                    };
                  } else {
                    // Default export with name
                    return {
                      text: astRecord.declaration.id.name,
                      file: file,
                      type: astRecord.declaration.type,
                      def: true
                    };
                  }
                } else {
                  // Named export for variables
                  if (astRecord.declaration.type === VARIABLE_DECLARATION) {
                    return _.map(astRecord.declaration.declarations, (declaration) => {
                      return {
                        text: declaration.id.name,
                        file: file,
                        type: declaration.type,
                        def: false
                      };
                    });
                  } else {
                    // Named export other than variables
                    return {
                      text: astRecord.declaration.id.name,
                      file: file,
                      type: astRecord.declaration.type,
                      def: false
                    };
                  }
                }
              }))
              .filter((record) => record.text);
          })
      );
    });
}

export function getImportsForEntireFileContent(content, version) {
  return callAstServer(['--no-file', content])
  .then((response) => {
    const imports = JSON.parse(response.data)
      .body
      .filter((record) => record.type === IMPORT_DECLARATION)
      .map((record) => {
        return {
          file: record.source.value,
          specifiers: record.specifiers.map((specifier) => {
            let textImported;
            if (specifier.type !== IMPORT_NAMESPACE_SPECIFIER) {
              textImported = specifier.imported ? specifier.imported.name : specifier.local.name;
            } else {
              textImported = '*';
            }

            return {
              textLocal: specifier.local.name,
              textImported: textImported,
              def: specifier.type === IMPORT_DEFAULT_SPECIFIER || specifier.type === IMPORT_NAMESPACE_SPECIFIER
            };
          })
        };
      });

      return {
        imports: imports,
        version: version
      };
  });
}
