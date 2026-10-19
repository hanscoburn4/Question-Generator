const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const math = {
  compile(expression) {
    const js = expression
      .replace(/\^/g, '**')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(');
    return {
      evaluate(scope) {
        const names = Object.keys(scope);
        return Function(...names, `return (${js});`)(...names.map(name => scope[name]));
      }
    };
  }
};
const sandbox = { window: { math }, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
for (const file of ['js/utils/question-utils.js', 'js/core/question-generator.js', 'js/graphics/drawing-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox);
}

const bank = JSON.parse(fs.readFileSync(path.join(root, 'src/data/question_bank.json'), 'utf8'));
const templates = bank['Algebra 2']['1: Relations and Functions']
  .filter(question => question.id.startsWith('ALG2-1.7'));

function recordingCanvas() {
  let current = [];
  const paths = [];
  const canvas = { width: 420, height: 300 };
  const context = new Proxy({
    canvas,
    beginPath() { current = []; },
    moveTo(x, y) { current.push([x, y]); },
    lineTo(x, y) { current.push([x, y]); },
    stroke() { if (current.length) paths.push([...current]); },
    measureText() { return { width: 10 }; }
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  canvas.getContext = () => context;
  return { canvas, paths };
}

test('section 1.7 includes the requested function variants', () => {
  assert.ok(templates.some(question => question.difficulty === 'intermediate' && question.question.includes('^3')));
  assert.ok(templates.some(question => question.difficulty === 'intermediate' && question.question.includes('^2') && question.variables.a));
  assert.ok(templates.some(question => question.difficulty === 'advanced' && question.question.includes('^3')));
  assert.ok(templates.every(question => !question.question.toLowerCase().includes('calculator')));
});

test('advanced a and b value sets isolate vertical and horizontal scaling', () => {
  const aFocused = templates.find(question => question.id === 'ALG2-1.7-A1');
  const bFocused = templates.find(question => question.id === 'ALG2-1.7-A2');
  assert.deepEqual(aFocused.variables.b.values, [-1, 1]);
  assert.deepEqual(bFocused.variables.a.values, [-1, 1]);
  assert.ok(bFocused.variables.b.values.some(value => Math.abs(value) > 1));
  assert.ok(bFocused.variables.b.values.some(value => Math.abs(value) < 1));
  assert.ok(bFocused.variables.b.values.some(value => value < 0));

  for (const b of bFocused.variables.b.values) {
    const fixed = structuredClone(bFocused);
    fixed.variables.b.values = [b];
    const question = sandbox.window.QuestionGenerator.generateQuestion(fixed);
    if (b < 0) assert.match(question.answer, /reflection over the y-axis/);
    if (Math.abs(b) > 1) assert.match(question.answer, /horizontal compression/);
    if (Math.abs(b) < 1) assert.match(question.answer, /horizontal stretch/);
  }
});

test('parent and transformed graphs have the required visibility by level', () => {
  for (const template of templates) {
    for (let i = 0; i < 25; i++) {
      const question = sandbox.window.QuestionGenerator.generateQuestion(template);
      assert.equal(question.variableErrors.length, 0, template.id);

      for (const key of Object.keys(template.variables)) {
        assert.ok(!question.questionText.includes(`{${key}`), `${template.id} unresolved question variable ${key}`);
        assert.ok(!question.answer.includes(`{${key}`), `${template.id} unresolved answer variable ${key}`);
      }

      const questionCanvas = recordingCanvas();
      const questionResult = sandbox.window.DrawingEngine.draw(
        questionCanvas.canvas,
        { ...question.draw, showGrid: false },
        question.variables,
        { context: 'question' }
      );
      const answerCanvas = recordingCanvas();
      const answerResult = sandbox.window.DrawingEngine.draw(
        answerCanvas.canvas,
        { ...question.draw, showGrid: false },
        question.variables,
        { context: 'answer' }
      );

      assert.equal(questionResult.errors.length, 0, template.id);
      assert.equal(answerResult.errors.length, 0, template.id);
      if (template.difficulty === 'advanced') {
        assert.equal(questionResult.renderedCount, 0, `${template.id} should show only a blank grid`);
        assert.equal(answerResult.renderedCount, 2, `${template.id} should show its transformed graph and key point`);
      } else {
        assert.equal(questionResult.renderedCount, 1, `${template.id} should show only its parent graph`);
        assert.equal(answerResult.renderedCount, 3, `${template.id} should show parent, transformation, and key point`);
      }
      assert.ok(answerCanvas.paths.length > 0, `${template.id} answer graph should contain plotted paths`);
    }
  }
});
