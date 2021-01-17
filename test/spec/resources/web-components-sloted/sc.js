customElements.define(
  'my-paragraph',
  class extends HTMLElement {
    constructor() {
      super();
      const template = document.getElementById('my-paragraph');
      const templateContent = template.content;
      this.attachShadow({ mode: 'open' }).appendChild(
        templateContent.cloneNode(true),
      )
    }
  },
)
