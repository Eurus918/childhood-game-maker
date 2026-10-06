/** 对话面板：只会发消息和摆选项，不含任何业务逻辑 */

export class ChatUI {
  constructor({ messagesEl, optionsEl, composerEl, inputEl, onPick, onSubmit }) {
    this.messagesEl = messagesEl;
    this.optionsEl = optionsEl;
    this.inputEl = inputEl;
    this.onPick = onPick || (() => {});
    this.onSubmit = onSubmit || (() => {});

    composerEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (inputEl.value || '').trim();
      if (!v) return;
      inputEl.value = '';
      this.onSubmit(v);
    });
  }

  push(text, who = 'ai') {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text;
    this.messagesEl.appendChild(d);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  setOptions(list) {
    this.optionsEl.innerHTML = '';
    list.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.type = 'button';
      b.textContent = o.t;
      b.addEventListener('click', () => this.onPick(o));
      this.optionsEl.appendChild(b);
    });
  }

  clearOptions() {
    this.optionsEl.innerHTML = '';
  }
}
