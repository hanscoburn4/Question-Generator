const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
let seed = 3102026;
const seededMath = Object.create(Math);
seededMath.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const math = {
  compile(expression) {
    const js = expression.replace(/\^/g, '**');
    return { evaluate(scope) {
      return Function(...Object.keys(scope), `return (${js});`)(...Object.values(scope));
    } };
  }
};
const sandbox = { Math: seededMath, window: { math }, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
for (const file of ['js/utils/question-utils.js', 'js/core/question-generator.js', 'js/graphics/drawing-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox);
}
const bank = JSON.parse(fs.readFileSync(path.join(root, 'src/data/question_bank.json'), 'utf8'));
const templates = bank['Algebra 2']['3: Quadratic Functions'];
const generate = q => sandbox.window.QuestionGenerator.generateQuestion(q);
const engine = sandbox.window.DrawingEngine;
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
function canvas() {
  const paths = [], fills = [], labels = [];
  let current = [];
  const c = { width: 420, height: 300 };
  const ctx = new Proxy({
    canvas: c,
    beginPath() { current = []; },
    moveTo(x, y) { current.push([x,y]); },
    lineTo(x, y) { current.push([x,y]); },
    stroke() { if (current.length) paths.push(current); },
    fill() { fills.push(this.fillStyle); },
    fillText(text,x,y) { labels.push({text,x,y}); },
    measureText() { return { width: 10 }; }
  }, { get: (o, k) => k in o ? o[k] : () => {} });
  c.getContext = () => ctx;
  return { c, paths, fills, labels };
}

test('Module 3 has unique IDs, dynamic coverage, and fully resolved finite examples', () => {
  assert.equal(new Set(templates.map(q => q.id)).size, templates.length);
  for (let section=1;section<=8;section++) {
    assert.ok(templates.some(q=>q.id.startsWith(`ALG2-3.${section}-`)),`missing section 3.${section}`);
  }
  for (const t of templates) {
    assert.ok(Object.values(t.variables).some(v => v?.min !== undefined || v?.values), t.id);
    for (let i = 0; i < 100; i++) {
      const q = generate(t);
      assert.equal(q.variableErrors.length, 0, t.id);
      for (const [key, value] of Object.entries(q.variables)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value), `${t.id}: ${key}`);
        assert.ok(!q.questionText.includes(`{${key}`), `${t.id} question: ${key}`);
        assert.ok(!q.answer.includes(`{${key}`), `${t.id} answer: ${key}`);
      }
      assert.doesNotMatch(q.answer, /NaN|undefined|If there are errors|sqrt\(/, t.id);
    }
  }
});

test('3.1 and 3.2 intermediate vertices are integral for every allowed input combination', () => {
  for (const t of templates.filter(q=>/^ALG2-3\.[12]-I/.test(q.id))) {
    assert.deepEqual(t.variables.a.values,[-3,-2,2,3]);
    const varying=t.id==='ALG2-3.1-I1' ? 'k' : t.id==='ALG2-3.2-I1' ? 'offset' : 'gap';
    for(const a of t.variables.a.values) for(let h=t.variables.h.min;h<=t.variables.h.max;h++) {
      if(t.variables.h.exclude?.includes(h)) continue;
      for(let n=t.variables[varying].min;n<=t.variables[varying].max;n++) {
        if(t.variables[varying].exclude?.some(ex=>ex===n || ex==='h'&&n===h || ex==='-h'&&n===-h)) continue;
        const fixed=structuredClone(t);
        fixed.variables.a={values:[a]};fixed.variables.h={values:[h]};fixed.variables[varying]={values:[n]};
        const {variables:v,variableErrors}=generate(fixed);
        assert.equal(variableErrors.length,0,t.id);
        assert.ok(Number.isInteger(v.h)&&Number.isInteger(v.k),t.id);
        close(-v.b/(2*v.a),v.h,t.id);
        close(v.a*v.h*v.h+v.b*v.h+v.c,v.k,t.id);
        if(t.id==='ALG2-3.2-I1') for(const x of [v.left,v.right]) {
          assert.ok(Number.isInteger(x),t.id);
          close(v.a*x*x+v.b*x+v.c,0,t.id);
        }
      }
    }
  }
});

test('3.3 adds three-factor products and multistep powers with correct complex answers', () => {
  const byId=id=>templates.find(q=>q.id===`ALG2-3.3-${id}`);
  const multiply=([a,b],[c,d])=>[a*c-b*d,a*d+b*c];
  const power=n=>{ let z=[1,0];for(let j=0;j<n;j++) z=multiply(z,[0,1]);return z; };
  const fixed=(t,values)=>{ const q=structuredClone(t);for(const [key,value] of Object.entries(values)) q.variables[key]={values:[value]};return generate(q); };
  assert.equal(byId('B4').difficulty,'basic');
  for(let n=5;n<=60;n++) {
    const q=fixed(byId('B4'),{n});
    const [real,imag]=power(n);
    assert.equal(q.variables.result,imag ? (imag===1?'i':'-i') : String(real));
  }
  for(let n=8;n<12;n++) for(let m=16;m<20;m++) {
    const q=fixed(byId('I2'),{n,m}),v=q.variables;
    const z=multiply([v.a,v.b],power(n)),w=multiply([v.c,v.d],power(m));
    close(v.real,z[0]+w[0],q.id);close(v.imag,z[1]+w[1],q.id);
    assert.equal(q.variableErrors.length,0);
  }
  for(let j=0;j<150;j++) {
    const q=generate(byId('I3')),v=q.variables;
    const expected=multiply([v.a,v.b],multiply([v.c,v.d],[v.e,v.f]));
    close(v.real,expected[0],q.id);close(v.imag,expected[1],q.id);
    assert.equal(q.variableErrors.length,0);
  }
  for(const [values,result] of [
    [{a:1,b:1,c:-1,d:-1},'0'],
    [{a:1,b:2,c:-1,d:-1},'i'],
    [{a:1,b:1,c:-1,d:-2},'-i'],
    [{a:2,b:1,c:1,d:-1},'3'],
    [{a:1,b:1,c:-1,d:2},'3i']
  ]) {
    const q=fixed(byId('I2'),{...values,n:8,m:12});
    assert.equal(q.answer,`\\(${result}\\)`);
  }
  assert.equal(fixed(byId('I3'),{a:1,b:1,c:1,d:2,e:3,f:-1}).answer,'\\(10i\\)');
  assert.equal(fixed(byId('I3'),{a:1,b:1,c:1,d:2,e:1,f:3}).answer,'\\(-10\\)');
});

test('3.4 I2 stays nonmonic after removing common factors and has the stated repeated root', () => {
  const t=templates.find(q=>q.id==='ALG2-3.4-I2');
  const gcd=(a,b)=>b ? gcd(b,a%b) : Math.abs(a);
  for(const m of t.variables.m.values) for(const r of t.variables.r.values) {
    const fixed=structuredClone(t);fixed.variables.m={values:[m]};fixed.variables.r={values:[r]};
    const q=generate(fixed),v=q.variables;
    assert.equal(q.variableErrors.length,0);
    assert.ok(v.a/gcd(gcd(v.a,v.b),v.c)>1);
    assert.equal(v.b*v.b-4*v.a*v.c,0);
    close(v.a*v.root*v.root+v.b*v.root+v.c,0,q.id);
    assert.ok(!Number.isInteger(v.root));
  }
});

test('3.4 advanced context models give positive dimensions and reject invalid roots', () => {
  const gcd=(a,b)=>b ? gcd(b,a%b) : Math.abs(a);
  const path=templates.find(q=>q.id==='ALG2-3.4-A2');
  for(let base=3;base<=8;base++) for(const gap of [3,5,7]) for(let width=2;width<=6;width++) {
    const fixed=structuredClone(path);fixed.variables.base={values:[base]};fixed.variables.gap={values:[gap]};fixed.variables.width={values:[width]};
    const q=generate(fixed),v=q.variables;
    assert.equal(q.variableErrors.length,0);
    assert.notEqual(v.gardenWidth,v.gardenLength);
    assert.equal((v.gardenWidth+2*width)*(v.gardenLength+2*width),v.area);
    for(const x of [width,v.other]) close(v.a*x*x+v.b*x+v.c,0,q.id);
    assert.ok(v.other<0&&width>0);
    assert.equal(v.factorConstant-2*v.width,v.b);
    assert.equal(-v.width*v.factorConstant,v.c);
    assert.equal(gcd(gcd(v.a,v.b),v.c),1);
    assert.ok(v.a>1);
  }
  const triangle=templates.find(q=>q.id==='ALG2-3.4-A3');
  for(const triple of triangle.variables.triple.values) for(let scale=1;scale<=3;scale++) {
    const fixed=structuredClone(triangle);fixed.variables.triple={values:[triple]};fixed.variables.scale={values:[scale]};
    const q=generate(fixed),v=q.variables;
    assert.equal(q.variableErrors.length,0);
    assert.equal(v.short*v.short+v.long*v.long,v.hypotenuse*v.hypotenuse);
    assert.equal(2*v.short-v.long,v.difference);
    for(const x of [v.short,v.other]) close(v.a*x*x+v.b*x+v.c,0,q.id);
    assert.ok(v.short>0&&v.long>v.short&&v.other<0);
    assert.equal(-v.short*v.factorConstant,v.c);
    assert.equal(v.factorConstant-5*v.short,v.b);
    assert.equal(gcd(gcd(v.a,v.b),v.c),1);
    assert.ok(v.a>1);
  }
});

test('3.5 vertex forms match the original functions and solution types match each level', () => {
  const section=templates.filter(q=>q.id.startsWith('ALG2-3.5-'));
  assert.equal(section.length,5);
  assert.equal(section.filter(q=>q.difficulty==='basic').length,1);
  assert.equal(section.filter(q=>q.difficulty==='intermediate').length,1);
  for(const t of section) for(let j=0;j<80;j++) {
    const q=generate(t),v=q.variables;
    assert.equal(q.variableErrors.length,0,t.id);
    assert.match(q.questionText,/vertex form/i,t.id);
    assert.match(q.answer,/Vertex form:/,t.id);
    assert.match(q.answer,/Vertex:/,t.id);
    const poly=x=>v.a*x*x+v.b*x+v.c;
    close(-v.b/(2*v.a),v.h,t.id);
    for(const x of [-3,0,2,v.h]) close(poly(x),v.a*(x-v.h)**2+v.k,t.id);
    if(t.difficulty!=='advanced') {
      assert.ok(Number.isInteger(v.h)&&Number.isInteger(v.k),t.id);
      const square=-v.k/v.a;
      if(square>=0) {
        const offset=Math.sqrt(square);
        for(const x of [v.h-offset,v.h+offset]) {
          close(poly(x),0,t.id);
          if(t.difficulty==='basic') assert.ok(Number.isInteger(x),t.id);
          else if(v.kind===2||v.kind===3) assert.ok(!Number.isInteger(x),t.id);
        }
      } else {
        assert.equal(t.id,'ALG2-3.5-I1');
        const imag=Math.sqrt(-square);
        close(v.a*(v.h*v.h-imag*imag)+v.b*v.h+v.c,0,t.id);
        close(2*v.a*v.h*imag+v.b*imag,0,t.id);
        assert.match(q.answer,/i\\sqrt/);
      }
    }
    if(t.id==='ALG2-3.5-A1') {
      assert.ok(v.a<0&&v.h>0&&v.c>0);
      close(poly(v.landing),0,t.id);
      close(poly(v.h-Math.sqrt(v.d)),0,t.id);
      assert.ok(v.h-Math.sqrt(v.d)<0);
      close(v.landingRounded,Math.round(v.landing*100)/100,t.id);
      assert.match(q.answer,/negative zero is outside/);
    }
    if(t.id==='ALG2-3.5-A2'||t.id==='ALG2-3.5-A3') {
      for(const x of [v.left,v.right]) { close(poly(x),0,t.id);assert.ok(!Number.isInteger(x),t.id); }
      assert.ok(v.left>0&&v.left<v.h&&v.h<v.right);
      if(t.id.endsWith('A2')) { assert.ok(v.a<0&&v.k>0);assert.match(q.answer,/breaks even/); }
      else { assert.ok(v.a>0&&v.k<0);close(v.depth,-v.k,t.id);close(v.width,v.right-v.left,t.id); }
    }
  }
});

test('3.5 consolidated templates support every root type without changing question wording', () => {
  const basic=templates.find(q=>q.id==='ALG2-3.5-B1');
  const inter=templates.find(q=>q.id==='ALG2-3.5-I1');
  for(const s of [0,1,2,3,4]) {
    const fixed=structuredClone(basic);fixed.variables.s={values:[s]};
    const q=generate(fixed),v=q.variables;
    assert.equal(q.variableErrors.length,0);
    assert.ok(Number.isInteger(v.left)&&Number.isInteger(v.right));
    assert.equal(q.answer.includes('repeated'),s===0);
    close(v.a*v.left*v.left+v.b*v.left+v.c,0,q.id);
  }
  for(const kind of inter.variables.kind.values) for(const direction of [-1,1]) for(const m of [2,3,4]) for(const s of [1,5]) for(const h of [-2,0,3]) {
    const fixed=structuredClone(inter);
    for(const [key,value] of Object.entries({kind,direction,m,s,h})) fixed.variables[key]={values:[value]};
    const q=generate(fixed),v=q.variables;
    assert.equal(q.variableErrors.length,0);
    for(const key of ['a','b','c','h','k']) assert.ok(Number.isInteger(v[key]),key);
    const offset=kind===0 ? 0 : s*Math.sqrt(v.d)/v.den;
    if(kind===4) {
      close(v.a*(h*h-offset*offset)+v.b*h+v.c,0,q.id);
      close(2*v.a*h*offset+v.b*offset,0,q.id);
      assert.match(q.answer,/i\\sqrt/);
    } else for(const x of [h-offset,h+offset]) close(v.a*x*x+v.b*x+v.c,0,q.id);
    assert.equal(q.answer.includes('repeated'),kind===0);
    if(kind===2) assert.ok(q.answer.includes(`\\frac{${s}}{${m}}`));
    if(kind===3) assert.match(q.answer,/\\sqrt/);
    assert.doesNotMatch(q.questionText,/kind|root type|repeated|irrational/);
  }
});

test('scaled grids use the same labeled steps for student and answer canvases', () => {
  const draw={window:{xMin:-1,xMax:4,yMin:-10,yMax:100},gridStep:{x:0.5,y:'scaleY'},showAxisLabels:true};
  const blank=canvas(),answer=canvas(),variables={scaleY:10};
  engine.drawCoordinateGrid(blank.c.getContext('2d'),420,300,draw.window,variables,{drawConfig:draw});
  engine.draw(answer.c,draw,variables,{context:'answer'});
  assert.deepEqual(blank.paths,answer.paths);
  assert.deepEqual(blank.labels,answer.labels);
  assert.ok(blank.labels.some(l=>l.text==='0.5'));
  assert.ok(blank.labels.some(l=>l.text==='50'));
  const defaultGrid=canvas();
  engine.draw(defaultGrid.c,{window:draw.window},{},{context:'question'});
  assert.equal(defaultGrid.labels.length,0,'existing questions keep their original grid style');
});

test('all graph questions keep solutions hidden and render answer curves within useful windows', () => {
  for (const t of templates.filter(q => q.draw)) {
    for (let i = 0; i < 8; i++) {
      const q = generate(t);
      const bounds = engine.normalizeWindow(q.draw.window, q.variables);
      assert.ok(bounds.xMin < bounds.xMax && bounds.yMin < bounds.yMax, t.id);
      for (const p of q.draw.points || []) {
        const x = engine.resolveNumericValue(p.x,q.variables,NaN);
        const y = engine.resolveNumericValue(p.y,q.variables,NaN);
        assert.ok(x > bounds.xMin && x < bounds.xMax && y > bounds.yMin && y < bounds.yMax, `${t.id}: clipped ${p.label} (${x},${y})`);
      }
      const blank = canvas(), answer = canvas();
      const questionResult = engine.draw(blank.c,{...q.draw,showGrid:false},q.variables,{context:'question'});
      const answerResult = engine.draw(answer.c,{...q.draw,showGrid:false},q.variables,{context:'answer'});
      assert.equal(questionResult.errors.length,0,t.id);
      assert.equal(questionResult.renderedCount,0,t.id);
      assert.equal(answerResult.errors.length,0,`${t.id}: ${JSON.stringify(answerResult.errors)}`);
      assert.ok(answerResult.renderedCount > 0 && answer.paths.length > 0,t.id);
      for (const points of answer.paths) for (const coordinates of points) assert.ok(coordinates.every(Number.isFinite),t.id);
      if (/3\.7-B/.test(t.id)) assert.ok(answer.fills.length > 0,`${t.id}: no shading`);
      if (/3\.7-B[12]$/.test(t.id)) assert.equal(q.draw.points[0].fillColor,'#ffffff','strict boundaries have open vertex markers');
    }
  }
});

test('3.2 advanced requires rearrangement and student graphing before reading roots', () => {
  const template=templates.find(q=>q.id==='ALG2-3.2-A1');
  for(const a of [-2,-1,1,2]) for(const h of [-2,-1,1,2]) for(const offset of [1,2,3].filter(n=>n!==Math.abs(h))) {
    const fixed=structuredClone(template);
    fixed.variables.a={values:[a]};fixed.variables.h={values:[h]};fixed.variables.offset={values:[offset]};
    const q=generate(fixed),v=q.variables;
    assert.equal(q.variableErrors.length,0);
    assert.doesNotMatch(q.questionText,/=\s*0|bridge|arch/i);
    assert.match(q.questionText,/Solve by graphing/);
    for(const key of ['lhsA','lhsB','lhsC','rhsA','rhsB','rhsC']) assert.notEqual(v[key],0,key);
    close(v.lhsA-v.rhsA,v.a,q.id);close(v.lhsB-v.rhsB,v.b,q.id);close(v.lhsC-v.rhsC,v.c,q.id);
    const curve=engine.compileExpression('a*x^2+b*x+c',v);
    close(curve({x:h}),v.k,q.id);
    for(const x of [v.left,v.right]) {
      close(curve({x}),0,q.id);
      close(v.lhsA*x*x+v.lhsB*x+v.lhsC,v.rhsA*x*x+v.rhsB*x+v.rhsC,q.id);
    }
    const bounds=engine.normalizeWindow(q.draw.window,v);
    assert.ok(bounds.xMin<v.left&&bounds.xMax>v.right&&bounds.yMin<Math.min(0,v.k)&&bounds.yMax>Math.max(0,v.k));
    assert.equal(q.draw.eq1.showInQuestion,false);
    assert.ok(q.draw.points.every(p=>p.showInQuestion===false));
    const student=canvas(),answer=canvas();
    const result=engine.draw(student.c,{...q.draw,showGrid:false},v,{context:'question'});
    assert.equal(result.errors.length,0);assert.equal(result.renderedCount,0);
    const solution=engine.draw(answer.c,{...q.draw,showGrid:false},v,{context:'answer'});
    assert.equal(solution.errors.length,0);assert.equal(solution.renderedCount,4);
  }
});

test('projectile roots, maxima and hundredth rounding agree with the height model', () => {
  for (const id of ['ALG2-3.1-A1','ALG2-3.6-A1']) {
    const t = templates.find(q=>q.id===id);
    for(let i=0;i<100;i++) {
      const {variables:v}=generate(t);
      close(-16*v.landing*v.landing+v.b*v.landing+v.c,0,id);
      assert.ok(v.landing>0,id);
      close(v.t,Math.round(v.landing*100)/100,id);
      close(v.peakTime,Math.max(0,v.b/32),id);
      close(v.peakHeight,-16*v.peakTime**2+v.b*v.peakTime+v.c,id);
    }
  }
});

test('factoring, graphing and exact quadratic roots satisfy their equations', () => {
  for(const t of templates) for(let i=0;i<40;i++) {
    const {variables:v}=generate(t);
    const poly=x=>v.a*x*x+v.b*x+v.c;
    if (['ALG2-3.2-B1','ALG2-3.2-I1'].includes(t.id)) {
      close(poly(v.left),0,t.id);close(poly(v.right),0,t.id);assert.ok(v.left<v.right);
    }
    if(t.id==='ALG2-3.4-B1') for(const x of [v.p,v.q]) close(x*x+v.b*x+v.c,0,t.id);
    if(t.id==='ALG2-3.4-I1') for(const x of [-v.q,-v.p/v.a]) close(v.a*(x*x+v.q*x),-v.p*x-v.p*v.q,t.id);
    if(t.id==='ALG2-3.4-A1') { close(v.length*v.width,v.area,t.id);assert.ok(v.length>0&&v.width>0); }
    if(v.deltaSign!==undefined) {
      const magnitude=v.s*Math.sqrt(v.d);
      if(v.deltaSign>=0) for(const x of [v.h-magnitude*v.deltaSign,v.h+magnitude*v.deltaSign]) close(poly(x),0,t.id);
      else {
        close(v.a*(v.h*v.h-magnitude*magnitude)+v.b*v.h+v.c,0,t.id);
        close(2*v.a*v.h*magnitude+v.b*magnitude,0,t.id);
      }
    }
  }
});

test('quadratic inequality answers match polynomial signs including endpoints and both opening directions', () => {
  for(const t of templates.filter(q=>/^ALG2-3\.7-[IA][12]$/.test(q.id))) {
    for(const a of t.variables.a.values) for(let i=0;i<20;i++) {
      const fixed=structuredClone(t);fixed.variables.a.values=[a];
      const {variables:v,answer}=generate(fixed);
      const greater=t.id.endsWith('I2')||t.id.endsWith('A1');
      const inclusive=t.id.endsWith('I1');
      for(const x of [v.left-1,v.left,(v.left+v.right)/2,v.right,v.right+1]) {
        const value=v.a*x*x+v.b*x+v.c;
        const expected=greater ? value>1e-8 : inclusive ? value<=1e-8 : value < -1e-8;
        const inside=inclusive ? x>=v.left&&x<=v.right : x>v.left&&x<v.right;
        const outside=inclusive ? x<=v.left||x>=v.right : x<v.left||x>v.right;
        assert.equal(v.outside ? outside : inside,expected,`${t.id}: ${answer}`);
      }
      assert.ok(v.left<v.right,t.id);
      assert.ok(answer.includes(v.outside?'or':'and'),answer);
    }
  }
});

test('nonlinear systems have exactly the advertised intersections', () => {
  for(const t of templates.filter(q=>q.id.startsWith('ALG2-3.8-'))) for(let i=0;i<100;i++) {
    const {variables:v}=generate(t);
    assert.notEqual(v.a1,0,t.id);
    if(t.id==='ALG2-3.8-I1') assert.notEqual(v.a2,0,t.id);
    const D=(v.b1-v.b2)**2-4*(v.a1-v.a2)*(v.c1-v.c2);
    if(t.id==='ALG2-3.8-I2') { assert.ok(D<0);continue; }
    if(t.id==='ALG2-3.8-B2') close(D,0,t.id);else assert.ok(D>0,t.id);
    for(const [x,y] of [[v.root1,v.y1],[v.root2,v.y2]]) {
      close(v.a1*x*x+v.b1*x+v.c1,y,t.id);
      close(v.a2*x*x+v.b2*x+v.c2,y,t.id);
    }
  }
});
