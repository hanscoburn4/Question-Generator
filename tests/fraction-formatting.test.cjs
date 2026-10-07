const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const context = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(context);
for (const file of ['js/utils/question-utils.js', 'js/core/question-generator.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}

test('fraction conversion preserves signs for proper and improper fractions', () => {
  for (const [value, numerator, denominator] of [[0.5, 1, 2], [0.25, 1, 4], [1.5, 3, 2], [1 / 3, 1, 3]]) {
    for (const sign of [-1, 1]) {
      const result = context.approximateFraction(sign * value);
      assert.equal(result.n, sign * numerator);
      assert.equal(result.d, denominator);
    }
  }
  assert.equal(context.formatNumberForDisplay(-0.5, null, {}, 'decimal'), '-0.5');
  assert.equal(context.formatNumberForDisplay(-2, null, {}, 'fraction'), '-2');
});

test('B2 displays fractional coefficients for both signs and every vertical shift', () => {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'src/data/question_bank.json'), 'utf8'));
  const template = bank['Algebra 2']['1: Relations and Functions'].find(q => q.id === 'ALG2-1.6-B2');
  for (const s of [-0.5, -0.25, 0.25, 0.5]) {
    for (let k = template.variables.k.min; k <= template.variables.k.max; k++) {
      const fixed = JSON.parse(JSON.stringify(template));
      fixed.variables.s.values = [s];
      fixed.variables.k = { values: [k] };
      const question = context.window.QuestionGenerator.generateQuestion(fixed);
      const denominator = Math.abs(s) === 0.5 ? 2 : 4;
      assert.equal(question.variableErrors.length, 0);
      assert.equal(question.variables.s, s);
      assert.equal(question.variables.__display.s, `\\frac{${s < 0 ? '-1' : '1'}}{${denominator}}`);
      assert.ok(question.questionText.includes(`\\lfloor ${s < 0 ? '-' : ''}\\frac{1}{${denominator}}x`));
      assert.ok(!question.questionText.includes(String(Math.abs(s))));
    }
  }
});
