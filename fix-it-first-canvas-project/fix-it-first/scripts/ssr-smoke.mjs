import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const store = {};
globalThis.sessionStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
globalThis.window = { location: { hash: '' }, addEventListener() {}, removeEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: false }) };
const server = await createServer({ plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const { StoreProvider } = await server.ssrLoadModule('/src/store.jsx');
const App = (await server.ssrLoadModule('/src/App.jsx')).default;
const { EXAMPLES } = await server.ssrLoadModule('/src/config.js');
const { defaultImportance } = await server.ssrLoadModule('/src/engine.js');

const ex = EXAMPLES[0];
store['fixitfirst.v1'] = JSON.stringify({ item: ex.item, problem: ex.problem, ctx: ex.ctx, currentId: 'it_x',
  prefs: { mode: 'balanced', budgetCap: false, importance: defaultImportance('balanced', ex.ctx.sentiment) },
  shelf: [], checks: {} });
for (const h of ['', '#/item', '#/problem', '#/situation', '#/results', '#/option/repair', '#/option/replace', '#/shelf']) {
  window.location.hash = h;
  const html = renderToString(React.createElement(StoreProvider, null, React.createElement(App)));
  console.log((h || '#/home').padEnd(18), html.length > 1500 ? 'OK ' : 'SHORT', html.length);
}
await server.close();
