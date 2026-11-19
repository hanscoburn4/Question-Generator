const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const root=path.join(__dirname,'..');
let seed=4102026;
const mathRandom=Object.create(Math);
mathRandom.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const math={compile(expression){return {evaluate(scope){return Function(...Object.keys(scope),`return (${expression.replace(/\^/g,'**')});`)(...Object.values(scope));}};}};
const sandbox={window:{math},Math:mathRandom,console:{log(){},warn(){},error(){}}};
vm.createContext(sandbox);
for(const file of ['js/utils/question-utils.js','js/core/question-generator.js','js/graphics/drawing-engine.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox);
const templates=JSON.parse(fs.readFileSync(path.join(root,'src/data/question_bank.json'),'utf8'))['Algebra 2']['4: Polynomial Functions'].filter(q=>q.id.startsWith('ALG2-4.1-'));
const generate=t=>sandbox.window.QuestionGenerator.generateQuestion(t);
const engine=sandbox.window.DrawingEngine;
function canvas(){
  const c={width:420,height:300},paths=[];let current=[];
  const ctx=new Proxy({canvas:c,beginPath(){current=[];},moveTo(x,y){current.push([x,y]);},lineTo(x,y){current.push([x,y]);},stroke(){if(current.length)paths.push(current);},measureText(){return {width:10};}},
    {get:(o,k)=>k in o?o[k]:()=>{}});
  c.getContext=()=>ctx;return {c,paths};
}
test('4.1 groups power and polynomial variants under one objective at all three levels',()=>{
  assert.equal(templates.length,6);
  assert.equal(new Set(templates.map(q=>q.id)).size,6);
  assert.deepEqual([...new Set(templates.map(q=>q.objective))],['4.1 Graph and Analyze Power and Polynomial Functions']);
  for(const power of [true,false]) {
    const group=templates.filter(q=>Boolean(q.variables.actualTurns)===power);
    assert.deepEqual(group.map(q=>q.difficulty).sort(),['advanced','basic','intermediate']);
    for(const q of group) {
      if(power) {
        assert.doesNotMatch(q.question,/leading term|maximum possible/i);
        assert.doesNotMatch(q.answer,/Leading term:|at most/);
        assert.match(q.question,/symmetry/);
      } else assert.match(q.question,/leading term/i);
    }
  }
});
test('leading terms, turn bounds, and both end behaviors stay correct for generated functions',()=>{
  for(const t of templates){
    const seen=new Set();
    for(let j=0;j<120;j++){
      const q=generate(t),v=q.variables;
      assert.equal(q.variableErrors.length,0,t.id);
      assert.ok(v.a!==0&&Number.isInteger(v.n)&&v.n>=2,t.id);
      if(!t.variables.actualTurns) assert.equal(v.maxTurns,v.n-1);
      for(const [key,value] of Object.entries(v)){
        if(typeof value==='number')assert.ok(Number.isFinite(value),`${t.id}:${key}`);
        assert.ok(!q.questionText.includes(`{${key}`)&&!q.answer.includes(`{${key}`),`${t.id}:${key}`);
      }
      const fn=engine.compileExpression(q.draw.eq1.relation.replace('y = ',''),v);
      const rightSign=Math.sign(fn({x:10000})),leftSign=Math.sign(fn({x:-10000}));
      assert.equal(rightSign,Math.sign(v.a));
      assert.equal(leftSign,Math.sign(v.a)*(v.n%2===0?1:-1));
      assert.equal(v.leftEnd,leftSign>0?'\\infty':'-\\infty');
      assert.equal(v.rightEnd,rightSign>0?'\\infty':'-\\infty');
      assert.ok(Math.abs(fn({x:100000})/100000**v.n-v.a)<0.001,t.id);
      if(!t.variables.actualTurns) assert.match(q.answer,/at most/);
      seen.add(`${Math.sign(v.a)}:${v.n%2}`);
      if(t.variables.actualTurns){
        assert.equal(Math.abs(fn({x:0})),0);assert.equal(v.actualTurns,v.n%2===0?1:0);
        assert.equal(v.symmetry,v.n%2===0?'symmetric about the y-axis':'symmetric about the origin');
        if(v.n%2===0) assert.ok(v.turnDescription.includes(v.a>0?'minimum':'maximum'));
        else assert.match(v.turnDescription,/not a turning point/);
      }
      if(t.id==='ALG2-4.1-A1')for(const x of [v.r1,0,v.r2])assert.equal(Math.abs(fn({x})),0);
      if(t.id==='ALG2-4.1-A2')assert.equal(fn({x:v.px}),v.py);
    }
    assert.equal(seen.size,4,`${t.id}: must cover both signs and parities`);
  }
});
test('4.1 student grids are blank and answer curves render without errors',()=>{
  for(const t of templates)for(let j=0;j<10;j++){
    const q=generate(t),student=canvas(),answer=canvas();
    const blank=engine.draw(student.c,{...q.draw,showGrid:false},q.variables,{context:'question'});
    const result=engine.draw(answer.c,q.draw,q.variables,{context:'answer'});
    assert.equal(blank.errors.length,0,t.id);assert.equal(blank.renderedCount,0,t.id);
    assert.equal(result.errors.length,0,`${t.id}: ${JSON.stringify(result.errors)}`);
    assert.ok(result.renderedCount>0&&answer.paths.length>0,t.id);
    for(const points of answer.paths)for(const coords of points)assert.ok(coords.every(Number.isFinite),t.id);
    const bounds=engine.normalizeWindow(q.draw.window,q.variables);
    for(const point of q.draw.points||[]){
      const x=engine.resolveNumericValue(point.x,q.variables,NaN),y=engine.resolveNumericValue(point.y,q.variables,NaN);
      assert.ok(x>bounds.xMin&&x<bounds.xMax&&y>bounds.yMin&&y<bounds.yMax,t.id);
    }
  }
});
