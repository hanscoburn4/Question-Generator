const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

test('assignment titles follow added questions and preserve the editable name', () => {
  const elements = new Map();
  const context = {
    window: {}, console,
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { addEventListener() {}, textContent: '' });
        return elements.get(id);
      },
      querySelectorAll() { return []; }
    }
  };
  vm.createContext(context);
  const root = path.join(__dirname, '..');
  for (const file of ['js/core/question-generator.js', 'js/ui/ui-manager.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  const generator = context.window.QuestionGenerator;
  generator.questionBank = JSON.parse(fs.readFileSync(path.join(root, 'src/data/question_bank.json'), 'utf8'));
  const ui = context.window.UIManager;
  const questions = generator.getQuestionsFromChapters('Algebra 1', ['Module 0']);
  ui.selectedQuestions = [questions[0], questions[0]];
  ui.updateDisplayedTitle();
  assert.equal(ui.customTitle, 'Algebra 1 - Module 0 - Lessons 0.1 - Name: ______________ - Date: __________');
  assert.equal(elements.get('displayTitle').textContent, 'Algebra 1 - Module 0');
  assert.equal(elements.get('displayLessons').textContent, 'Lessons 0.1');
  assert.equal(elements.get('displayDate').textContent, 'Date: __________');
  ui.studentName = 'Alex <Smith>';
  ui.assignmentDate = '10/19/2026';
  ui.selectedQuestions.push(...generator.getQuestionsFromChapters('Construction Geometry', ['1: Measurement, Plans & Precision']).slice(0, 1));
  ui.updateDisplayedTitle();
  assert.match(ui.customTitle, /^Algebra 1, Construction Geometry - Module 0, Unit 1:/);
  assert.ok(ui.customTitle.endsWith('Lessons 0.1, 1.1 - Name: Alex <Smith> - Date: 10/19/2026'));
  ui.selectedQuestions = [{ course: 'Algebra 1', chapter: 'Module 4 & 5', id: 'ALG1-4.1 & 4.2-B1' }];
  ui.updateDisplayedTitle();
  assert.ok(ui.customTitle.includes('Lessons 4.1, 4.2'));
  ui.selectedQuestions = [];
  ui.updateDisplayedTitle();
  assert.equal(ui.customTitle, 'Course - Module/Unit - Lessons - Name: Alex <Smith> - Date: 10/19/2026');
});
