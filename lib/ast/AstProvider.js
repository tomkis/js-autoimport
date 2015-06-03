'use babel';

import BufferedNodeProcessExecutorPool from '../utils/BufferedNodeProcessExecutorPool.js';

const Q = require('q');
const path = require('path');
const _ = require('lodash');

const EXPORT_DEFAULT = 'ExportDefaultDeclaration';
const EXPORT_NAMED = 'ExportNamedDeclaration';
const IMPORT_DEFAULT = 'ImportDefaultSpecifier';
const IMPORT_DECLARATION = 'ImportDeclaration';
const IMPORT_DEFAULT_SPECIFIER = 'ImportDefaultSpecifier';
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
          .map((response) => {
            const file = response.value.args[0];

            return JSON.parse(response.value.data)
              .body
              .filter((astRecord) => (astRecord.type === EXPORT_NAMED || astRecord.type === EXPORT_DEFAULT) && astRecord.declaration)
              .map((astRecord) => {
                // TODO: the implementation is really messy, needs to be cleaned up
                if (astRecord.declaration.type === VARIABLE_DECLARATION) {
                  return {
                    text: astRecord.declaration.declarations[0].id.name,
                    file: file,
                    type: astRecord.declaration.declarations[0].type,
                    def: astRecord.type === EXPORT_DEFAULT
                  };
                } else {
                  return {
                    text: astRecord.declaration.id ? astRecord.declaration.id.name : astRecord.declaration.name, //TODO:
                    file: file,
                    type: astRecord.declaration.type,
                    def: astRecord.type === EXPORT_DEFAULT
                  };
                }
              })
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
            return specifier.local.name;
          }),
          def: record.specifiers.length === 1 && record.specifiers[0].type === IMPORT_DEFAULT_SPECIFIER
        };
      });

      return {
        imports: imports,
        version: version
      };
  });
}
