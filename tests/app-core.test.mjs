import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  createAccount,
  switchAccount,
  getActiveAccount,
  getDailyPlan,
  getLessonForTask,
  buildQuiz,
  completeTask,
  completeLesson,
  gradeQuiz,
  getStats,
  exportState,
  importState,
} from '../src/app-core.mjs';

test('accounts keep learning progress isolated', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, '我');
  const firstId = state.activeAccountId;
  state = completeTask(state, '2026-06-29', 'english-daily');

  state = createAccount(state, '老婆');
  const secondId = state.activeAccountId;

  assert.notEqual(firstId, secondId);
  assert.deepEqual(getActiveAccount(state).progress, {});

  state = switchAccount(state, firstId);
  assert.deepEqual(
    getActiveAccount(state).progress['2026-06-29'].completedTaskIds,
    ['english-daily'],
  );
});

test('daily plan always includes English and rotates politics/math before exam', () => {
  const plan = getDailyPlan('2026-07-02');

  assert.equal(plan.some((task) => task.id === 'english-daily'), true);
  assert.equal(plan.some((task) => task.subject === '英语'), true);
  assert.equal(plan.some((task) => task.subject === '高数（二）' || task.subject === '政治'), true);
});

test('quiz grading stores wrong answers with explanations', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, '我');

  const quiz = {
    id: 'quiz-demo',
    mode: 'daily',
    subject: '英语',
    date: '2026-06-29',
    questions: [
      {
        id: 'eng-001',
        subject: '英语',
        prompt: 'choose',
        options: ['A', 'B', 'C', 'D'],
        answer: 2,
        explanation: 'C is correct.',
      },
    ],
  };

  state = gradeQuiz(state, quiz, { 'eng-001': 1 });
  const account = getActiveAccount(state);

  assert.equal(account.examRecords.length, 1);
  assert.equal(account.examRecords[0].score, 0);
  assert.equal(account.wrongBook.length, 1);
  assert.equal(account.wrongBook[0].explanation, 'C is correct.');
});

test('stats count task completion and quiz accuracy', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, '我');
  state = completeTask(state, '2026-06-29', 'english-daily');

  const quiz = {
    id: 'quiz-demo',
    mode: 'daily',
    subject: '政治',
    date: '2026-06-29',
    questions: [
      { id: 'pol-001', subject: '政治', prompt: 'p1', options: ['A', 'B'], answer: 0, explanation: 'A' },
      { id: 'pol-002', subject: '政治', prompt: 'p2', options: ['A', 'B'], answer: 1, explanation: 'B' },
    ],
  };
  state = gradeQuiz(state, quiz, { 'pol-001': 0, 'pol-002': 0 });

  const stats = getStats(getActiveAccount(state));

  assert.equal(stats.completedTaskCount, 1);
  assert.equal(stats.quizCount, 1);
  assert.equal(stats.answerCount, 2);
  assert.equal(stats.correctCount, 1);
  assert.equal(stats.accuracy, 50);
});

test('state can be exported and imported for backup', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, '我');

  const json = exportState(state);
  const imported = importState(json);

  assert.equal(imported.accounts[0].name, '我');
  assert.equal(imported.activeAccountId, state.activeAccountId);
});

test('import rejects malformed account collections instead of truncating data', () => {
  assert.throws(
    () => importState(JSON.stringify({ version: 1, activeAccountId: null, accounts: { bad: true } })),
    /accounts/i,
  );
});

test('import rejects unsupported future backup versions', () => {
  assert.throws(
    () => importState(JSON.stringify({ version: 999, activeAccountId: null, accounts: [] })),
    /version/i,
  );
});

test('wrong-question quiz keeps the selected subject filter', () => {
  const quiz = buildQuiz({
    subject: '英语',
    mode: 'wrong',
    count: 10,
    date: '2026-06-29',
    wrongQuestionIds: ['eng-001', 'pol-001'],
  });

  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.questions[0].id, 'eng-001');
  assert.equal(quiz.questions[0].subject, '英语');
});

test('repeated mistakes update one wrong-book item per question', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');

  const quiz = {
    id: 'repeat-wrong-demo',
    mode: 'daily',
    subject: '英语',
    date: '2026-06-29',
    questions: [
      {
        id: 'eng-repeat',
        subject: '英语',
        prompt: 'repeat',
        options: ['A', 'B', 'C'],
        answer: 2,
        explanation: 'C is correct.',
      },
    ],
  };

  state = gradeQuiz(state, quiz, { 'eng-repeat': 0 });
  state = gradeQuiz(state, { ...quiz, date: '2026-06-30' }, { 'eng-repeat': 1 });

  const account = getActiveAccount(state);
  assert.equal(account.wrongBook.length, 1);
  assert.equal(account.wrongBook[0].selected, 1);
  assert.equal(account.wrongBook[0].mistakeCount, 2);
});

test('today tasks map to study lessons with content and questions', () => {
  const lesson = getLessonForTask('english-daily', '2026-06-29');

  assert.equal(lesson.subject, '英语');
  assert.equal(lesson.taskIds.includes('english-daily'), true);
  assert.equal(lesson.sections.length > 0, true);
  assert.equal(lesson.questions.length > 0, true);
});

test('daily lessons rotate by date within the same task', () => {
  const first = getLessonForTask('english-daily', '2026-06-29');
  const second = getLessonForTask('english-daily', '2026-06-30');

  assert.notEqual(first.id, second.id);
});

test('completing a lesson records per-account lesson progress and task completion', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');

  const lesson = getLessonForTask('english-daily', '2026-06-29');
  const answers = Object.fromEntries(lesson.questions.map((question) => [question.id, question.answer]));
  state = completeLesson(state, '2026-06-29', 'english-daily', lesson, answers);

  const account = getActiveAccount(state);
  const progress = account.progress['2026-06-29'];

  assert.equal(progress.completedTaskIds.includes('english-daily'), true);
  assert.equal(progress.lessonRecords.length, 1);
  assert.equal(progress.lessonRecords[0].lessonId, lesson.id);
  assert.equal(progress.lessonRecords[0].score, 100);
});

test('lesson mistakes are added to the wrong book with explanations', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');

  const lesson = getLessonForTask('math2-core', '2026-06-30');
  const answers = Object.fromEntries(lesson.questions.map((question) => [question.id, -1]));
  state = completeLesson(state, '2026-06-30', 'math2-core', lesson, answers);

  const account = getActiveAccount(state);
  assert.equal(account.wrongBook.length, lesson.questions.length);
  assert.equal(account.wrongBook.every((item) => item.explanation), true);
});

test('course-work consistently maps to administrative management lessons', () => {
  const dates = ['2026-10-25', '2026-10-26', '2026-10-27'];
  const lessons = dates.map((date) => getLessonForTask('course-work', date));

  assert.equal(lessons.every((lesson) => lesson.subject === '行政管理'), true);
});

test('degree-english maps to degree and thesis lessons', () => {
  const lesson = getLessonForTask('degree-english', '2026-10-25');

  assert.equal(lesson.subject, '学位与论文');
});
