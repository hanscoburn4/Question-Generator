const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
for (const file of ['js/utils/question-utils.js', 'js/core/question-generator.js', 'js/graphics/drawing-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox);
}
const engine = sandbox.window.DrawingEngine;
const bounds = { xMin: -6.5, xMax: 6.5, yMin: -11, yMax: 11 };

function verifySegments(step, variables = {}, domain) {
  const segments = engine.getStepSegments({ step, domain }, bounds, variables);
  const value = (key, fallback) => typeof step[key] === 'string' ? variables[step[key]] : (step[key] ?? fallback);
  const b = value('inputScale', 1), c = value('inputOffset', 0);
  const a = value('outputScale', 1), d = value('outputOffset', 0);
  const round = Math[step.mode || 'floor'];
  assert.ok(segments.length > 0);
  for (const segment of segments) {
    if (segment.min < segment.max) {
      const midpoint = (segment.min + segment.max) / 2;
      assert.equal(segment.y, a * round(b * midpoint + c) + d);
    }
    for (const marker of segment.markers) {
      // Breakpoints are exact integer inputs, allowing for arithmetic roundoff.
      const z = b * marker.x + c;
      const atJump = Math.abs(z - Math.round(z)) < 1e-9;
      const expected = a * round(atJump ? Math.round(z) : z) + d;
      const excluded = (marker.x === domain?.min && domain.minInclusive === false) ||
        (marker.x === domain?.max && domain.maxInclusive === false);
      assert.equal(segment.y === expected && !excluded, marker.closed);
      assert.ok(marker.x >= bounds.xMin && marker.x <= bounds.xMax);
    }
  }
  return segments;
}

test('floor and ceiling handle shifts, scaling, and both reflection directions', () => {
  for (const mode of ['floor', 'ceil']) {
    for (const inputScale of [-4, -0.5, 0.25, 3]) {
      for (const inputOffset of [-2, 0.5, 3]) {
        for (const outputScale of [-2, 0.5, 1]) {
          verifySegments({ mode, inputScale, inputOffset, outputScale, outputOffset: 2 });
        }
      }
    }
  }
});

test('domain endpoints are marked, viewport clipping is not, and edge values are preserved', () => {
  const segments = verifySegments({ mode: 'floor' }, {}, { min: -0.25, max: 2 });
  assert.equal(segments[0].min, -0.25);
  assert.ok(segments.some(s => s.markers.some(p => p.x === -0.25 && p.closed)));
  assert.ok(!verifySegments({ mode: 'floor' }).some(s => s.markers.some(p => p.x === -6.5)));
  assert.ok(segments.some(s => s.y === 2 && s.markers.some(p => p.x === 2 && p.closed)));
  assert.equal(engine.getStepSegments({ step: {}, domain: { min: 20, max: 30 } }, bounds).length, 0);
});

test('a half-open staircase omits the next step at an excluded upper endpoint', () => {
  for (const outputScale of [-2, -1, 1, 2]) {
    const segments = verifySegments({ mode: 'floor', outputScale }, {}, { min: -2, max: 3, maxInclusive: false });
    assert.ok(!segments.some(s => s.min === 3));
    assert.ok(!segments.some(s => s.markers.some(p => p.x === 3 && p.closed)));
    assert.ok(segments.some(s => s.markers.some(p => p.x === 3 && !p.closed)));
  }
});

test('constant cases omit jump markers; invalid or excessive step counts fail clearly', () => {
  for (const step of [{ inputScale: 0, inputOffset: 2.5 }, { outputScale: 0, outputOffset: 4 }]) {
    const segments = engine.getStepSegments({ step }, bounds);
    assert.equal(segments.length, 1);
    assert.equal(segments[0].markers.length, 0);
  }
  assert.throws(() => engine.getStepSegments({ step: { mode: 'invalid' } }, bounds), /mode/);
  assert.throws(() => engine.getStepSegments({ step: { inputScale: 'missing' } }, bounds), /parameters/);
  assert.throws(() => engine.getStepSegments({ step: { inputScale: 10000 } }, bounds), /Too many/);
});

function recordingCanvas() {
  const paths = [], fills = [];
  let current = [];
  const canvas = { width: 420, height: 300 };
  const context = new Proxy({
    canvas,
    beginPath() { current = []; },
    moveTo(x, y) { current.push([x, y]); },
    lineTo(x, y) { current.push([x, y]); },
    stroke() { if (current.length) paths.push([...current]); },
    fill() { fills.push(this.fillStyle); },
    measureText() { return { width: 10 }; }
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  canvas.getContext = () => context;
  return { canvas, paths, fills };
}

test('B2 matches floor(s*x+k) for every allowed value; graphs are answer-only', () => {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'src/data/question_bank.json'), 'utf8'));
  const template = bank['Algebra 2']['1: Relations and Functions'].find(q => q.id === 'ALG2-1.6-B2');
  for (const s of template.variables.s.values) {
    for (let k = template.variables.k.min; k <= template.variables.k.max; k++) {
      const fixed = JSON.parse(JSON.stringify(template));
      fixed.variables.s.values = [s];
      fixed.variables.k = { values: [k] };
      const question = sandbox.window.QuestionGenerator.generateQuestion(fixed);
      assert.equal(question.variableErrors.length, 0);
      verifySegments(question.draw.eq1.step, question.variables);
      for (const context of ['question', 'answer']) {
        const recording = recordingCanvas();
        const result = engine.draw(recording.canvas, { ...question.draw, showGrid: false }, question.variables, { context });
        assert.equal(result.errors.length, 0);
        assert.equal(result.renderedCount, context === 'answer' ? 1 : 0);
        if (context === 'question') assert.equal(recording.paths.length, 0);
        else {
          assert.ok(recording.paths.length > 0);
          assert.ok(recording.fills.includes('#ffffff'));
          assert.ok(recording.fills.includes('#2563eb'));
          for (const line of recording.paths) {
            assert.equal(line.length, 2);
            assert.equal(line[0][1], line[1][1], 'No vertical connectors between steps');
          }
        }
      }
    }
  }
});

test('ordinary relation normalization is unchanged', () => {
  const equation = engine.normalizeEquationEntry({ relation: 'y = x^2', showInQuestion: false });
  assert.equal(equation.relation, 'y = x^2');
  assert.equal(equation.step, undefined);
  assert.equal(equation.showInQuestion, false);
  assert.equal(equation.showInAnswer, true);
});
