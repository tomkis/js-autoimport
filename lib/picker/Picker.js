'use babel'

import { Emitter, CompositeDisposable } from 'atom'

const CHANGED_EVENT = 'changed';

export default class Picker {

  constructor() {
    this.disposable = new CompositeDisposable();
    this.emitter = new Emitter();
    this.panel = atom.workspace.addModalPanel({
      item: this,
      visible: false
    });

    this.disposable.add(atom.keymaps.add('atom-text-editor.picker-active', {
      'atom-text-editor.picker-active': {
        'enter': 'picker:confirm'
      }
    }));

    this.disposable.add(atom.commands.add('atom-text-editor.picker-active', {
      'picker:confirm': this.confirm.bind(this),
      'core:cancel': this.cancel.bind(this),
      'core:move-up': this.moveUp.bind(this),
      'core:move-down': this.moveDown.bind(this)
    }));
  }

  onChange(cb) {
    this.emitter.on(CHANGED_EVENT, cb);
  }

  moveUp(ev) {
    if (this.itemIndex > 0) {
      ev.stopImmediatePropagation();
      this.itemIndex--;

      this.emitter.emit(CHANGED_EVENT, this);
    }
  }

  moveDown(ev) {
    if (this.itemIndex < (this.itemsCount - 1)) {
      ev.stopImmediatePropagation();
      this.itemIndex++;

      this.emitter.emit(CHANGED_EVENT, this);
    }
  }

  confirm(ev) {
    ev.stopImmediatePropagation();
    this.resolve(this.items[this.itemIndex]);
    this.removeActiveClassFromEditor();
    this.panel.hide();
  }

  cancel(ev) {
    ev.stopImmediatePropagation();
    this.reject();
    this.removeActiveClassFromEditor();
    this.panel.hide();
  }

  show(items, importedName) {
    this.items = items;
    this.itemsCount = items.length;
    this.itemIndex = 0;
    this.importedName = importedName;
    this.emitter.emit(CHANGED_EVENT, this);
    this.panel.show();
    this.addActiveClassToEditor();

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  addActiveClassToEditor() {
    const activeEditor = atom.views.getView(atom.workspace.getActiveTextEditor());
    if (activeEditor) {
      activeEditor.classList.add('picker-active');
    }
  }

  removeActiveClassFromEditor() {
    const activeEditor = atom.views.getView(atom.workspace.getActiveTextEditor());
    if (activeEditor) {
      activeEditor.classList.remove('picker-active');
    }
  }

}
