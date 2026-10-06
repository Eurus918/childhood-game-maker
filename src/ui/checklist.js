/** 右上角的「正在生成」清单：让用户看见一个世界是怎么一件件长出来的 */

export class Checklist {
  constructor(root, items) {
    this.root = root;
    this.items = items.map((it) => ({ key: it.key, label: it.label, on: false }));
    this.render();
  }

  mark(key) {
    const it = this.items.find((i) => i.key === key);
    if (it) it.on = true;
    this.render();
  }

  reset() {
    this.items.forEach((i) => { i.on = false; });
    this.render();
  }

  render() {
    this.root.innerHTML = '';
    this.items.forEach((c) => {
      const s = document.createElement('span');
      s.className = 'chip' + (c.on ? ' on' : '');
      s.textContent = (c.on ? '✓ ' : '○ ') + c.label;
      this.root.appendChild(s);
    });
  }
}
