import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  createAccount,
  switchAccount,
  getActiveAccount,
  getActiveExamContext,
  getDailyPlan,
  getExamSubjects,
  getLessonForTask,
  getLessonSpeechTargets,
  buildQuiz,
  completeTask,
  completeLesson,
  gradeQuiz,
  getStats,
  getWrongBookItems,
  exportState,
  importState,
  isTaskCompleted,
  selectEconomistMajor,
  selectExamCategory,
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

test('english lessons expose word and sentence pronunciation targets', () => {
  const lesson = getLessonForTask('english-daily', '2026-06-29');
  const targets = getLessonSpeechTargets(lesson);

  assert.equal(targets.some((target) => target.kind === 'word' && target.text === 'benefit'), true);
  assert.equal(
    targets.some((target) => target.kind === 'sentence' && target.text === 'She has worked in Shanghai since 2020.'),
    true,
  );
});

test('non-english lessons do not expose pronunciation targets', () => {
  const lesson = getLessonForTask('politics-core', '2026-06-29');

  assert.deepEqual(getLessonSpeechTargets(lesson), []);
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
test('middle economist requires a professional specialty before generating a plan', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');
  state = selectExamCategory(state, 'economist-intermediate-2026');

  const pendingContext = getActiveExamContext(getActiveAccount(state));
  assert.equal(pendingContext.examId, 'economist-intermediate-2026');
  assert.equal(pendingContext.ready, false);
  assert.throws(() => getDailyPlan('2026-07-01', pendingContext), /specialty|major|专业/i);

  state = selectEconomistMajor(state, 'human-resources');
  const readyContext = getActiveExamContext(getActiveAccount(state));
  const plan = getDailyPlan('2026-07-01', readyContext);

  assert.equal(readyContext.ready, true);
  assert.equal(plan.some((task) => task.id === 'economist-foundation-daily'), true);
  assert.equal(plan.some((task) => task.id === 'economist-professional-core'), true);
  assert.equal(plan.some((task) => task.subject === '经济基础知识'), true);
  assert.equal(plan.some((task) => task.subject === '人力资源管理'), true);
});

test('same account keeps adult-undergraduate and economist progress isolated', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');

  const adultContext = getActiveExamContext(getActiveAccount(state));
  state = completeTask(state, '2026-07-01', 'english-daily', adultContext.examId);

  state = selectExamCategory(state, 'economist-intermediate-2026');
  state = selectEconomistMajor(state, 'human-resources');
  const economistContext = getActiveExamContext(getActiveAccount(state));
  state = completeTask(
    state,
    '2026-07-01',
    'economist-foundation-daily',
    economistContext.examId,
    economistContext.majorId,
  );

  const account = getActiveAccount(state);
  assert.equal(isTaskCompleted(account, '2026-07-01', 'english-daily', adultContext.examId), true);
  assert.equal(isTaskCompleted(account, '2026-07-01', 'english-daily', economistContext.examId), false);
  assert.equal(
    isTaskCompleted(
      account,
      '2026-07-01',
      'economist-foundation-daily',
      economistContext.examId,
      economistContext.majorId,
    ),
    true,
  );
  assert.equal(getStats(account, adultContext.examId).completedTaskCount, 1);
  assert.equal(getStats(account, economistContext.examId, economistContext.majorId).completedTaskCount, 1);
});

test('same account keeps economist specialty progress isolated', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');
  state = selectExamCategory(state, 'economist-intermediate-2026');
  state = selectEconomistMajor(state, 'human-resources');
  const humanResourcesContext = getActiveExamContext(getActiveAccount(state));
  state = completeTask(
    state,
    '2026-07-01',
    'economist-professional-core',
    humanResourcesContext.examId,
    humanResourcesContext.majorId,
  );

  state = selectEconomistMajor(state, 'finance');
  const financeContext = getActiveExamContext(getActiveAccount(state));
  const account = getActiveAccount(state);

  assert.equal(
    isTaskCompleted(
      account,
      '2026-07-01',
      'economist-professional-core',
      humanResourcesContext.examId,
      humanResourcesContext.majorId,
    ),
    true,
  );
  assert.equal(
    isTaskCompleted(
      account,
      '2026-07-01',
      'economist-professional-core',
      financeContext.examId,
      financeContext.majorId,
    ),
    false,
  );
  assert.equal(getStats(account, humanResourcesContext.examId, humanResourcesContext.majorId).completedTaskCount, 1);
  assert.equal(getStats(account, financeContext.examId, financeContext.majorId).completedTaskCount, 0);
});

test('economist quiz uses foundation plus the selected specialty only', () => {
  const quiz = buildQuiz({
    examId: 'economist-intermediate-2026',
    majorId: 'human-resources',
    subject: '全部',
    mode: 'daily',
    count: 20,
    date: '2026-07-01',
  });

  assert.equal(quiz.questions.length > 0, true);
  assert.equal(
    quiz.questions.every(
      (question) =>
        question.examId === 'economist-intermediate-2026' &&
        ['经济基础知识', '人力资源管理'].includes(question.subject),
    ),
    true,
  );
});

test('economist subject options are generated after specialty selection', () => {
  assert.deepEqual(getExamSubjects('economist-intermediate-2026', null), []);
  assert.deepEqual(getExamSubjects('economist-intermediate-2026', 'human-resources'), [
    '全部',
    '经济基础知识',
    '人力资源管理',
  ]);
});

test('non-default economist specialties keep their subject and starter lesson scoped', () => {
  const context = { examId: 'economist-intermediate-2026', majorId: 'finance' };
  const quiz = buildQuiz({
    ...context,
    subject: '金融',
    mode: 'daily',
    count: 10,
    date: '2026-07-01',
  });
  const lesson = getLessonForTask('economist-professional-core', '2026-07-01', context);

  assert.deepEqual(getExamSubjects(context.examId, context.majorId), ['全部', '经济基础知识', '金融']);
  assert.equal(quiz.questions.length > 0, true);
  assert.equal(quiz.questions.every((question) => question.subject === '金融' && question.majorId === 'finance'), true);
  assert.equal(lesson.majorId, 'generic');
});

test('generic economist specialty lesson mistakes stay isolated by selected specialty', () => {
  let state = createInitialState('2026-06-29');
  state = createAccount(state, 'Me');
  state = selectExamCategory(state, 'economist-intermediate-2026');
  state = selectEconomistMajor(state, 'finance');
  const financeContext = getActiveExamContext(getActiveAccount(state));
  const financeLesson = getLessonForTask('economist-professional-core', '2026-07-01', financeContext);
  const financeAnswers = Object.fromEntries(financeLesson.questions.map((question) => [question.id, -1]));
  state = completeLesson(
    state,
    '2026-07-01',
    'economist-professional-core',
    financeLesson,
    financeAnswers,
    financeContext,
  );

  state = selectEconomistMajor(state, 'business');
  const businessContext = getActiveExamContext(getActiveAccount(state));
  const businessLesson = getLessonForTask('economist-professional-core', '2026-07-01', businessContext);
  const businessAnswers = Object.fromEntries(businessLesson.questions.map((question) => [question.id, -1]));
  state = completeLesson(
    state,
    '2026-07-01',
    'economist-professional-core',
    businessLesson,
    businessAnswers,
    businessContext,
  );

  const account = getActiveAccount(state);
  const financeWrong = getWrongBookItems(account, financeContext.examId, financeContext.majorId);
  const businessWrong = getWrongBookItems(account, businessContext.examId, businessContext.majorId);

  assert.equal(financeWrong.length, financeLesson.questions.length);
  assert.equal(businessWrong.length, businessLesson.questions.length);
  assert.equal(financeWrong.every((item) => item.majorId === 'finance'), true);
  assert.equal(businessWrong.every((item) => item.majorId === 'business'), true);
});
