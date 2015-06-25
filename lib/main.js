'use babel';

import AutoSuggestProvider from './autosuggest/AutoSuggestProvider.js'
import ExportIndex from './exportindex/ExportIndex.js'
import ImportOrganiser from './imports/ImportOrganiser.js'
import ImportRepository from './imports/ImportRepository.js'

const exportIndex = new ExportIndex();
const importOrganiser = new ImportOrganiser();
const importRepository = new ImportRepository(importOrganiser);
const autoSuggestProvider = new AutoSuggestProvider(exportIndex, importRepository);

function onChangeActivePane(pane) {
  // If new active pane has buffer, it's TextEditor and we should observeChanges
  // otherwise dispose any observation
  if (pane && pane.getBuffer) {
    importOrganiser.setEditor(pane);
    importRepository.observeChanges(pane);
    exportIndex.observeChanges(pane);
  } else {
    importRepository.disposeIfNecessary();
    exportIndex.disposeIfNecessary();
  }
}

export function activate() {
  exportIndex.buildIndex();
  importRepository.registerChange(importOrganiser.organiseImports.bind(importOrganiser));

  onChangeActivePane(atom.workspace.getActivePaneItem());
  atom.workspace.onDidChangeActivePaneItem(onChangeActivePane);
}

export function serialize() {
  // TODO: we might want to implement this
}

export function provide() {
  return autoSuggestProvider;
}


export const config = {
  ignoredFolders: {
    type: 'array',
    default: ['node_modules', 'test', 'bin', 'dist']
  },
  allowedSuffixes: {
    type: 'array',
    default: ['.js', '.jsx']
  },
  trailingSemicolon: {
    type: 'boolean',
    default: false
  },
  spaceForNamedImports: {
    type: 'boolean',
    default: true
  }
};
