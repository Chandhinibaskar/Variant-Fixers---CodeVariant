import assert from 'node:assert/strict';
import { assess, defaultImportance } from '../src/engine.js';
import { EXAMPLES } from '../src/config.js';

const run = (ex, mode = 'balanced', budgetCap = false) =>
  assess(ex.item, ex.problem, ex.ctx, { mode, importance: defaultImportance(mode, ex.ctx.sentiment), budgetCap });

for (const ex of EXAMPLES) {
  const r = run(ex);
  console.log(`\n${ex.label}`);
  r.ranked.forEach((o) => console.log(`  #${o.rank} ${o.label.padEnd(10)} ${o.score.toFixed(1)}  cost ₹${o.cost}  ${o.flags.join(',')}`));
  assert.equal(r.options.length, 5);
  r.options.forEach((o) => assert.ok(o.score >= 0 && o.score <= 100));
}
// Sanity expectations
assert.equal(run(EXAMPLES[1]).ranked[0].id, 'repair', 'torn jeans → repair');
assert.notEqual(run(EXAMPLES[0]).ranked[0].id, 'reuse', 'faulty electrical must not be gifted');
const chair = run(EXAMPLES[2]);
assert.ok(['recycle', 'replace'].includes(chair.ranked[0].id), 'cracked old chair → recycle/replace');
// Replace is scored like the others (never hard-coded last)
assert.ok(run({ ...EXAMPLES[0], item: { ...EXAMPLES[0].item, age: 12 } }).options.find((o) => o.id === 'replace').score > 0);
// Eco-first should lift repair/reuse vs replace
const e = run(EXAMPLES[2], 'eco'), b = run(EXAMPLES[2], 'balanced');
assert.ok(e.options.find((o) => o.id === 'replace').score < b.options.find((o) => o.id === 'replace').score);
console.log('\nAll engine checks passed ✔');
