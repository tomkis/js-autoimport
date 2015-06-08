'use babel'

class PickerElement extends HTMLElement {

  initialize(model) {
    model.onChange(this.render.bind(this));
    return this;
  }

  render(model) {
    this.innerHTML = `
      <div class="select-list">
        <div class="title">Multiple imports found for <span>${model.importedName}</span></div>
        <ol class="list-group">
          ${model.items.map((item, index) => {
            if (index === model.itemIndex) {
              return `<li class="selected">${item}</li>`;
            } else {
              return `<li>${item}</li>`;
            }
          }).join('\n')}
        </ol>
      </div>
    `;
  }
}

export default document.registerElement('x-picker', PickerElement);
