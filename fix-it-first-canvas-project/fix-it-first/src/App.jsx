import React, { useEffect } from 'react';
import { useRoute } from './useRoute.js';
import { useStore, itemReady, problemReady } from './store.jsx';
import Landing from './screens/Landing.jsx';
import ItemStep from './screens/ItemStep.jsx';
import ProblemStep from './screens/ProblemStep.jsx';
import SituationStep from './screens/SituationStep.jsx';
import Results from './screens/Results.jsx';
import OptionDetail from './screens/OptionDetail.jsx';
import Shelf from './screens/Shelf.jsx';

const STEPS = [
  { key: 'item', label: 'Item' },
  { key: 'problem', label: 'Problem' },
  { key: 'situation', label: 'Situation' },
  { key: 'results', label: 'Result' },
];

export default function App() {
  const [route, go] = useRoute();
  const { state } = useStore();

  // Guard: never show a screen whose earlier answers are missing.
  let name = route.name;
  const needsItem = ['problem', 'situation', 'results', 'option'].includes(name);
  if (needsItem && !itemReady(state.item)) name = 'item';
  else if (['situation', 'results', 'option'].includes(name) && !problemReady(state.problem)) name = 'problem';
  useEffect(() => { if (name !== route.name) go(name); }, [name, route.name, go]);

  const stepIndex = ['item', 'problem', 'situation', 'results', 'option'].indexOf(name);
  const showStepper = stepIndex >= 0;
  const active = Math.min(stepIndex, 3);

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <button className="brand" onClick={() => go('')} aria-label="Fix It First home">
          <span className="brand-mark" aria-hidden>🛠️</span>
          <span className="brand-name">Fix It <em>First</em></span>
        </button>
        <nav className="topnav" aria-label="Main">
          <button className={`navlink ${name === 'shelf' ? 'on' : ''}`} onClick={() => go('shelf')}>
            Shelf <span className="count" aria-label={`${state.shelf.length} saved`}>{state.shelf.length}</span>
          </button>
        </nav>
      </header>

      {showStepper && (
        <ol className="stepper" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className={i < active ? 'done' : i === active ? 'now' : ''} aria-current={i === active ? 'step' : undefined}>
              <span className="dot">{i < active ? '✓' : i + 1}</span>
              <span className="lbl">{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      <main id="main" tabIndex={-1} className="main">
        {name === 'home' && <Landing go={go} />}
        {name === 'item' && <ItemStep go={go} />}
        {name === 'problem' && <ProblemStep go={go} />}
        {name === 'situation' && <SituationStep go={go} />}
        {name === 'results' && <Results go={go} />}
        {name === 'option' && <OptionDetail go={go} optionId={route.arg} />}
        {name === 'shelf' && <Shelf go={go} />}
        {!['home', 'item', 'problem', 'situation', 'results', 'option', 'shelf'].includes(name) && <Landing go={go} />}
      </main>

      <footer className="foot">
        <span>Fix It First · Team Variant Fixers · CodeVariant — Build Different</span>
        <span className="muted">Estimates are indicative. Always follow safety guidance for electrical items.</span>
      </footer>
    </div>
  );
}
