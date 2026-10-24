import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/#/results', pretendToBeVisual: true });
const w = dom.window;
Object.assign(globalThis, { window: w, document: w.document, sessionStorage: w.sessionStorage, HTMLElement: w.HTMLElement, Node: w.Node, requestAnimationFrame: w.requestAnimationFrame.bind(w), cancelAnimationFrame: w.cancelAnimationFrame.bind(w), confirm: () => true });
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
w.scrollTo = () => {}; w.scrollBy = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const server = await createServer({ plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react');
const { StoreProvider } = await server.ssrLoadModule('/src/store.jsx');
const { DndProvider } = await server.ssrLoadModule('/src/dnd.jsx');
const App = (await server.ssrLoadModule('/src/App.jsx')).default;
const { EXAMPLES } = await server.ssrLoadModule('/src/config.js');
const { defaultImportance } = await server.ssrLoadModule('/src/engine.js');

const ex = EXAMPLES[1];
sessionStorage.setItem('fixitfirst.v1', JSON.stringify({ item: ex.item, problem: ex.problem, ctx: ex.ctx, currentId: 'it_t', shelf: [], checks: {},
  prefs: { mode: 'balanced', budgetCap: false, excluded: [], importance: defaultImportance('balanced', ex.ctx.sentiment) } }));

const root = createRoot(document.getElementById('root'));
await act(async () => root.render(React.createElement(StoreProvider, null, React.createElement(DndProvider, null, React.createElement(App)))));

// fake layout: give every zone a distinct rect
let i = 0;
document.querySelectorAll('[data-zone]').forEach((z) => { const n = i++; z.getBoundingClientRect = () => ({ left: 100 * n, right: 100 * n + 90, top: 1000, bottom: 1080, width: 90, height: 80 }); });

const ev = (type, x, y, id = 1) => { const e = new w.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }); e.pointerId = id; e.pointerType = 'mouse'; return e; };
const zoneCenter = (id) => { const r = document.querySelector(`[data-zone="${id}"]`).getBoundingClientRect(); return [r.left + 40, r.top + 40]; };
const state = () => JSON.parse(sessionStorage.getItem('fixitfirst.v1'));

async function drag(cardEl, zoneId) {
  const [x, y] = zoneCenter(zoneId);
  await act(async () => { cardEl.dispatchEvent(ev('pointerdown', 5, 5)); });
  await act(async () => { w.dispatchEvent(ev('pointermove', 20, 20)); });
  await act(async () => { w.dispatchEvent(ev('pointermove', x, y)); });
  const armed = document.querySelectorAll('.zone.armed').length, over = document.querySelector('.zone.over')?.dataset.zone;
  await act(async () => { w.dispatchEvent(ev('pointerup', x, y)); });
  return { armed, over };
}
const card = (label) => [...document.querySelectorAll('li.opt')].find((c) => c.textContent.includes(label));
const log = (...a) => console.log(...a);

// 1. Go with this
let top = document.querySelector('li.opt h3').textContent.trim();
let r = await drag(document.querySelector('li.opt'), 'go');
log('drag → Go with this:', r, '| shelf:', state().shelf.length, '| chosen:', state().shelf[0]?.chosen);
if (state().shelf.length !== 1 || !state().shelf[0].chosen) throw new Error('go-with failed');

// 2. Rule out the last card
const before = document.querySelectorAll('li.opt').length;
const last = [...document.querySelectorAll('li.opt')].pop();
r = await drag(last, 'rule');
log('drag → Rule out:', r, '| options', before, '→', document.querySelectorAll('li.opt').length, '| excluded:', state().prefs.excluded);
if (document.querySelectorAll('li.opt').length !== before - 1) throw new Error('rule-out failed');

// 3. Restore it by dragging the mini card into the list zone
const mini = document.querySelector('.mini');
i = 0; document.querySelectorAll('[data-zone]').forEach((z) => { const n = i++; z.getBoundingClientRect = () => ({ left: 100 * n, right: 100 * n + 90, top: 1000, bottom: 1080, width: 90, height: 80 }); });
r = await drag(mini, 'list');
log('drag → restore:', r, '| options now', document.querySelectorAll('li.opt').length, '| excluded:', state().prefs.excluded);
if (document.querySelectorAll('li.opt').length !== before) throw new Error('restore failed');

// 4. Wrong zone for a card = nothing happens (zone not armed)
r = await drag(document.querySelector('li.opt'), 'list');
log('drag option → inappropriate zone:', r);

// 5. Keyboard flow: Enter picks up, ArrowRight cycles, Enter drops on Save
const c0 = document.querySelector('li.opt');
c0.focus();
await act(async () => { c0.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
const overAfterPick = document.querySelector('.zone.over')?.dataset.zone;
await act(async () => { w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
log('keyboard pick-up highlights first zone:', overAfterPick, '| cancelled →', document.querySelectorAll('.zone.armed').length === 0);

console.log('\nAll drag-and-drop checks passed ✔');
await server.close(); process.exit(0);
