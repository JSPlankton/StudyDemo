import { LESSON_LIBRARY, QUESTION_BANK, REVIEW_POINTS } from './content.mjs';

const STATE_VERSION = 1;
const PLAN_START = '2026-06-29';
const EXPECTED_EXAM_DATE = '2026-10-24';

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function todayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function dateToDayNumber(dateString) {
  return Math.floor(new Date(`${dateString}T00:00:00+08:00`).getTime() / 86400000);
}

function daysBetween(fromDate, toDate) {
  return dateToDayNumber(toDate) - dateToDayNumber(fromDate);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(state) {
  return {
    version: state.version || STATE_VERSION,
    createdAt: state.createdAt || todayString(),
    activeAccountId: state.activeAccountId || null,
    accounts: Array.isArray(state.accounts) ? state.accounts.map(normalizeAccount) : [],
  };
}

function validateImportedState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid state: backup root must be an object.');
  }
  if (typeof raw.version !== 'number') {
    throw new Error('Invalid state: version is required.');
  }
  if (raw.version > STATE_VERSION) {
    throw new Error(`Unsupported backup version: ${raw.version}.`);
  }
  if (!Array.isArray(raw.accounts)) {
    throw new Error('Invalid state: accounts must be an array.');
  }

  raw.accounts.forEach((account, index) => {
    if (!account || typeof account !== 'object' || Array.isArray(account)) {
      throw new Error(`Invalid state: account ${index + 1} must be an object.`);
    }
    if (typeof account.id !== 'string' || account.id.length === 0) {
      throw new Error(`Invalid state: account ${index + 1} is missing id.`);
    }
    if (account.progress && (typeof account.progress !== 'object' || Array.isArray(account.progress))) {
      throw new Error(`Invalid state: account ${index + 1} progress must be an object.`);
    }
    if (account.wrongBook && !Array.isArray(account.wrongBook)) {
      throw new Error(`Invalid state: account ${index + 1} wrongBook must be an array.`);
    }
    if (account.examRecords && !Array.isArray(account.examRecords)) {
      throw new Error(`Invalid state: account ${index + 1} examRecords must be an array.`);
    }
  });
}

function normalizeAccount(account) {
  return {
    id: account.id,
    name: account.name || '学员',
    createdAt: account.createdAt || todayString(),
    progress: account.progress || {},
    wrongBook: Array.isArray(account.wrongBook) ? account.wrongBook : [],
    examRecords: Array.isArray(account.examRecords) ? account.examRecords : [],
    settings: {
      dailyGoalMinutes: account.settings?.dailyGoalMinutes || 90,
      ...(account.settings || {}),
    },
  };
}

function activeIndex(state) {
  return state.accounts.findIndex((account) => account.id === state.activeAccountId);
}

function requireActiveAccount(state) {
  const index = activeIndex(state);
  if (index < 0) {
    throw new Error('No active account. Create or switch to an account first.');
  }
  return index;
}

function deterministicShuffle(items, seedText) {
  const scored = items.map((item) => ({
    item,
    score: hashText(`${seedText}:${item.id}`),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.map(({ item }) => item);
}

function recordWrongAnswer(account, question, selected, wrongDate) {
  const existingWrong = account.wrongBook.find((item) => item.questionId === question.id);
  const wrongRecord = {
    questionId: question.id,
    subject: question.subject,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    selected,
    explanation: question.explanation,
    tags: question.tags || [],
    date: wrongDate,
    lastWrongAt: wrongDate,
    reviewed: false,
  };

  if (existingWrong) {
    Object.assign(existingWrong, wrongRecord, {
      id: existingWrong.id,
      firstWrongAt: existingWrong.firstWrongAt || existingWrong.date || wrongDate,
      mistakeCount: (existingWrong.mistakeCount || 1) + 1,
    });
    return;
  }

  account.wrongBook.push({
    id: makeId('wrong'),
    firstWrongAt: wrongDate,
    mistakeCount: 1,
    ...wrongRecord,
  });
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createInitialState(createdAt = todayString()) {
  return {
    version: STATE_VERSION,
    createdAt,
    activeAccountId: null,
    accounts: [],
  };
}

export function createAccount(state, name) {
  const next = normalizeState(clone(state));
  const trimmedName = String(name || '').trim() || `学员${next.accounts.length + 1}`;
  const account = normalizeAccount({
    id: makeId('account'),
    name: trimmedName,
    createdAt: todayString(),
  });
  next.accounts.push(account);
  next.activeAccountId = account.id;
  return next;
}

export function renameAccount(state, accountId, name) {
  const next = normalizeState(clone(state));
  const account = next.accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }
  account.name = String(name || '').trim() || account.name;
  return next;
}

export function switchAccount(state, accountId) {
  const next = normalizeState(clone(state));
  if (!next.accounts.some((account) => account.id === accountId)) {
    throw new Error(`Account not found: ${accountId}`);
  }
  next.activeAccountId = accountId;
  return next;
}

export function getActiveAccount(state) {
  const normalized = normalizeState(state);
  return normalized.accounts.find((account) => account.id === normalized.activeAccountId) || null;
}

export function getDailyPlan(dateString = todayString()) {
  const dayOffset = Math.max(0, daysBetween(PLAN_START, dateString));
  const weekday = new Date(`${dateString}T00:00:00+08:00`).getDay();
  const beforeExam = dateToDayNumber(dateString) <= dateToDayNumber(EXPECTED_EXAM_DATE);
  const alternatingSubject = dayOffset % 2 === 0 ? '政治' : '高数（二）';
  const alternatingId = alternatingSubject === '政治' ? 'politics-core' : 'math2-core';
  const alternatingTitle = alternatingSubject === '政治' ? '政治框架与选择题' : '高数（二）基础题型';

  const tasks = [
    {
      id: 'english-daily',
      subject: '英语',
      title: '英语每日必学',
      minutes: 25,
      kind: 'daily',
      detail: '词汇10分钟、语法或阅读10分钟、作文句型5分钟。',
      review: REVIEW_POINTS.english,
    },
  ];

  if (beforeExam) {
    tasks.push(
      {
        id: alternatingId,
        subject: alternatingSubject,
        title: alternatingTitle,
        minutes: 35,
        kind: 'core',
        detail:
          alternatingSubject === '政治'
            ? '先看一个高频知识点，再做10道选择题。'
            : '先复习公式，再做6道基础题，错题当天订正。',
        review: alternatingSubject === '政治' ? REVIEW_POINTS.politics : REVIEW_POINTS.math2,
      },
      {
        id: 'wrong-review',
        subject: '复习',
        title: '错题和记忆回炉',
        minutes: 20,
        kind: 'review',
        detail: '复盘最近错题，写下错误原因和下次识别点。',
        review: ['当天错题当天处理', '每周把重复错题列入周考前复习'],
      },
    );
  } else {
    tasks.push(
      {
        id: 'degree-english',
        subject: '学位与论文',
        title: '学位英语或等效条件准备',
        minutes: 30,
        kind: 'degree',
        detail: '确认当年学校规则，保持英语不断线。',
        review: REVIEW_POINTS.degree,
      },
      {
        id: 'course-work',
        subject: '行政管理',
        title: '课程作业与期末复习',
        minutes: 30,
        kind: 'course',
        detail: '按平台任务推进，提前整理期末重点。',
        review: REVIEW_POINTS.degree,
      },
    );
  }

  if (weekday === 0) {
    tasks.push({
      id: 'weekly-exam',
      subject: '周考',
      title: '周考和本周总结',
      minutes: 45,
      kind: 'weekly',
      detail: '英语、政治、高数（二）混合小卷，记录薄弱项。',
      review: ['先限时做题', '再看解析', '最后更新错题本'],
    });
  }

  const dayOfMonth = Number(dateString.slice(8, 10));
  if (dayOfMonth >= 26) {
    tasks.push({
      id: 'monthly-exam',
      subject: '月考',
      title: '月考模拟',
      minutes: 60,
      kind: 'monthly',
      detail: '每月月底做一次综合卷，观察正确率趋势。',
      review: ['统计各科正确率', '下月计划向最低科目倾斜'],
    });
  }

  return tasks;
}

export function completeTask(state, dateString, taskId) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const dateProgress = account.progress[dateString] || { completedTaskIds: [] };
  if (!dateProgress.completedTaskIds.includes(taskId)) {
    dateProgress.completedTaskIds.push(taskId);
  }
  dateProgress.updatedAt = todayString();
  account.progress[dateString] = dateProgress;
  return next;
}

export function uncompleteTask(state, dateString, taskId) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const dateProgress = account.progress[dateString] || { completedTaskIds: [] };
  dateProgress.completedTaskIds = dateProgress.completedTaskIds.filter((id) => id !== taskId);
  dateProgress.updatedAt = todayString();
  account.progress[dateString] = dateProgress;
  return next;
}

export function isTaskCompleted(account, dateString, taskId) {
  return Boolean(account?.progress?.[dateString]?.completedTaskIds?.includes(taskId));
}

export function getLessonForTask(taskId, dateString = todayString()) {
  const candidates = LESSON_LIBRARY.filter((lesson) => lesson.taskIds.includes(taskId));
  if (candidates.length === 0) {
    throw new Error(`No lesson found for task: ${taskId}`);
  }
  const index = dateToDayNumber(dateString) % candidates.length;
  return clone(candidates[index]);
}

export function completeLesson(state, dateString, taskId, lesson, answers = {}) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
  const normalizedAnswers = answers || {};
  let correctCount = 0;

  const answerRecords = questions.map((question) => {
    const selected = Object.prototype.hasOwnProperty.call(normalizedAnswers, question.id)
      ? normalizedAnswers[question.id]
      : null;
    const correct = selected === question.answer;
    if (correct) {
      correctCount += 1;
    } else {
      recordWrongAnswer(account, question, selected, dateString);
    }

    return {
      questionId: question.id,
      selected,
      answer: question.answer,
      correct,
    };
  });

  const dateProgress = account.progress[dateString] || { completedTaskIds: [] };
  if (!Array.isArray(dateProgress.completedTaskIds)) {
    dateProgress.completedTaskIds = [];
  }
  if (!dateProgress.completedTaskIds.includes(taskId)) {
    dateProgress.completedTaskIds.push(taskId);
  }

  dateProgress.lessonRecords = (dateProgress.lessonRecords || []).filter(
    (record) => !(record.taskId === taskId && record.lessonId === lesson.id),
  );
  dateProgress.lessonRecords.push({
    id: makeId('lesson-record'),
    taskId,
    lessonId: lesson.id,
    subject: lesson.subject,
    title: lesson.title,
    date: dateString,
    score: questions.length === 0 ? 100 : Math.round((correctCount / questions.length) * 100),
    correctCount,
    total: questions.length,
    answers: answerRecords,
    completedAt: todayString(),
  });
  dateProgress.updatedAt = todayString();
  account.progress[dateString] = dateProgress;

  return next;
}

export function buildQuiz({
  subject = '全部',
  mode = 'daily',
  count = 8,
  date = todayString(),
  questions = QUESTION_BANK,
  wrongQuestionIds = [],
} = {}) {
  let candidates = subject === '全部' ? questions : questions.filter((question) => question.subject === subject);

  if (mode === 'wrong') {
    const wrongSet = new Set(wrongQuestionIds);
    candidates = candidates.filter((question) => wrongSet.has(question.id));
  }

  const selected = deterministicShuffle(candidates, `${date}:${mode}:${subject}`).slice(0, count);
  return {
    id: `${mode}-${subject}-${date}-${selected.map((question) => question.id).join('-')}`,
    mode,
    subject,
    date,
    questions: selected,
  };
}

export function gradeQuiz(state, quiz, answers) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const normalizedAnswers = answers || {};
  const total = quiz.questions.length;
  let correctCount = 0;

  const answerRecords = quiz.questions.map((question) => {
    const selected = Object.prototype.hasOwnProperty.call(normalizedAnswers, question.id)
      ? normalizedAnswers[question.id]
      : null;
    const correct = selected === question.answer;
    if (correct) {
      correctCount += 1;
    } else {
      recordWrongAnswer(account, question, selected, quiz.date || todayString());
    }
    return {
      questionId: question.id,
      selected,
      answer: question.answer,
      correct,
    };
  });

  account.examRecords.push({
    id: quiz.id || makeId('quiz'),
    mode: quiz.mode || 'practice',
    subject: quiz.subject || '全部',
    date: quiz.date || todayString(),
    score: total === 0 ? 0 : Math.round((correctCount / total) * 100),
    correctCount,
    total,
    answers: answerRecords,
  });

  return next;
}

export function markWrongReviewed(state, wrongId, reviewed = true) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const item = account.wrongBook.find((wrong) => wrong.id === wrongId);
  if (item) {
    item.reviewed = reviewed;
    item.reviewedAt = todayString();
  }
  return next;
}

export function getStats(account) {
  const progressValues = Object.values(account?.progress || {});
  const completedTaskCount = progressValues.reduce(
    (sum, progress) => sum + (progress.completedTaskIds?.length || 0),
    0,
  );
  const examRecords = account?.examRecords || [];
  const answerCount = examRecords.reduce((sum, record) => sum + (record.total || 0), 0);
  const correctCount = examRecords.reduce((sum, record) => sum + (record.correctCount || 0), 0);

  return {
    completedTaskCount,
    quizCount: examRecords.length,
    answerCount,
    correctCount,
    accuracy: answerCount === 0 ? 0 : Math.round((correctCount / answerCount) * 100),
    wrongCount: account?.wrongBook?.length || 0,
    reviewPendingCount: (account?.wrongBook || []).filter((item) => !item.reviewed).length,
    activeDays: progressValues.filter((progress) => (progress.completedTaskIds || []).length > 0).length,
  };
}

export function exportState(state) {
  return JSON.stringify(normalizeState(state), null, 2);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  validateImportedState(parsed);
  const normalized = normalizeState(parsed);
  if (normalized.activeAccountId && !normalized.accounts.some((account) => account.id === normalized.activeAccountId)) {
    normalized.activeAccountId = normalized.accounts[0]?.id || null;
  }
  return normalized;
}

export function getTodayString() {
  return todayString();
}
