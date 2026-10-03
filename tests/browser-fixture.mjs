import vm from 'node:vm';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
export function runtime(options = {}) {
  const nodes = new Map(), store = new Map(Object.entries(options.storage || {}));
  const context2d = new Proxy({}, { get: (o, key) => o[key] ?? (() => {}), set: (o,k,v) => (o[k]=v,true) });
  function element() {
    return { innerHTML: '', textContent: '', children: [], listeners: {}, style: { setProperty() {} }, dataset: {}, value: '',
      classList: { add() {}, remove() {}, toggle() {} }, clientWidth: 800,
      append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      getContext: () => context2d, querySelector: () => element(), querySelectorAll: () => [],
      setAttribute() {}, focus() {}, click() {}, remove() {}, reset() {}, scrollIntoView() {},
    };
  }
  const node = key => { if (!nodes.has(key)) nodes.set(key,element()); return nodes.get(key); };
  const document = { querySelector: node, getElementById: node, querySelectorAll: () => [], createElement: element, body: element(), addEventListener() {} };
  const sandbox = { document, console, Date, JSON, Number, Blob, URL, Response, Request, Headers, AbortSignal, setTimeout, clearTimeout,
    window: { crypto: { randomUUID: () => 'fixture-id' }, addEventListener() {}, devicePixelRatio: 1, alert() {} },
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key,value) => store.set(key,value), removeItem: key => store.delete(key) },
    fetch: options.fetch || (async () => new Response('{"ok":true,"hasApiKey":true}')),
  };
  const context = vm.createContext(sandbox);
  const code = process.env.SECURITY_BASELINE
    ? execFileSync('git',['show',process.env.SECURITY_BASELINE + ':script.js'],{encoding:'utf8'})
    : fs.readFileSync('script.js','utf8');
  vm.runInContext(code,context);
  return { context, node, store, run: code => vm.runInContext(code,context) };
}
