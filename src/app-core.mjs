import { LESSON_LIBRARY, QUESTION_BANK, REVIEW_POINTS } from './content.mjs';
import {
  DEFAULT_EXAM_ID,
  ECONOMIST_EXAM_ID,
  ECONOMIST_DEFAULT_MAJOR_ID,
  ECONOMIST_LESSON_LIBRARY,
  ECONOMIST_MAJOR_OPTIONS,
  ECONOMIST_QUESTION_BANK,
  ECONOMIST_REVIEW_POINTS,
  EXAM_CATEGORIES,
  getEconomistMajor,
  getExamCategory,
} from './exams.mjs';

const STATE_VERSION = 2;
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

function normalizeExamId(examId = DEFAULT_EXAM_ID) {
  return EXAM_CATEGORIES.some((exam) => exam.id === examId) ? examId : DEFAULT_EXAM_ID;
}

function scopedDateKey(dateString, examId = DEFAULT_EXAM_ID, majorId = null) {
  const normalizedExamId = normalizeExamId(examId);
  if (normalizedExamId === DEFAULT_EXAM_ID) return dateString;
  if (normalizedExamId === ECONOMIST_EXAM_ID) {
    return `${normalizedExamId}:${majorId || 'unselected'}:${dateString}`;
  }
  return `${normalizedExamId}:${dateString}`;
}

function progressKeyMatchesScope(key, examId = DEFAULT_EXAM_ID, majorId = null) {
  const normalizedExamId = normalizeExamId(examId);
  if (normalizedExamId === DEFAULT_EXAM_ID) return !key.includes(':');
  if (normalizedExamId === ECONOMIST_EXAM_ID) {
    return Boolean(majorId) && key.startsWith(`${normalizedExamId}:${majorId}:`);
  }
  return key.startsWith(`${normalizedExamId}:`);
}

function unscopedDateKey(key) {
  return key.includes(':') ? key.slice(key.lastIndexOf(':') + 1) : key;
}

function normalizeExamSelections(settings = {}) {
  const selections =
    settings.examSelections && typeof settings.examSelections === 'object' && !Array.isArray(settings.examSelections)
      ? settings.examSelections
      : {};
  const economistMajorId = selections[ECONOMIST_EXAM_ID]?.majorId || settings.economistMajorId || null;

  return {
    ...selections,
    [ECONOMIST_EXAM_ID]: {
      ...(selections[ECONOMIST_EXAM_ID] || {}),
      majorId: getEconomistMajor(economistMajorId)?.id || null,
    },
  };
}

function getAccountExamId(account) {
  return normalizeExamId(account?.settings?.activeExamId || DEFAULT_EXAM_ID);
}

function getAccountMajorId(account, examId = getAccountExamId(account)) {
  if (examId !== ECONOMIST_EXAM_ID) return null;
  const majorId = account?.settings?.examSelections?.[ECONOMIST_EXAM_ID]?.majorId || null;
  return getEconomistMajor(majorId)?.id || null;
}

function isEconomistQuestionForMajor(question, majorId) {
  if (question.examId !== ECONOMIST_EXAM_ID) return false;
  if (question.subject === '经济基础知识') return true;
  if (!majorId) return false;
  if (question.majorId === majorId) return true;
  return question.majorId === 'generic';
}

function questionMatchesExam(question, examId, majorId) {
  const questionExamId = question.examId || DEFAULT_EXAM_ID;
  if (questionExamId !== examId) return false;
  if (examId === ECONOMIST_EXAM_ID) {
    return isEconomistQuestionForMajor(question, majorId);
  }
  return true;
}

function wrongMatchesExam(item, examId, majorId) {
  const itemExamId = item.examId || DEFAULT_EXAM_ID;
  if (itemExamId !== examId) return false;
  if (examId !== ECONOMIST_EXAM_ID) return true;
  if (!majorId) return item.subject === '经济基础知识';
  return item.subject === '经济基础知识' || item.majorId === majorId || item.majorId === 'generic';
}

function wrongMatchesQuestion(item, question, examId, majorId) {
  if (item.questionId !== question.id || (item.examId || DEFAULT_EXAM_ID) !== examId) return false;
  if (examId !== ECONOMIST_EXAM_ID) return true;
  if (question.subject === '经济基础知识') return item.subject === '经济基础知识';
  return (item.majorId || null) === (majorId || question.majorId || null);
}

function normalizeState(state) {
  return {
    version: STATE_VERSION,
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
  const settings = account.settings || {};
  return {
    id: account.id,
    name: account.name || '学员',
    createdAt: account.createdAt || todayString(),
    progress: account.progress || {},
    wrongBook: Array.isArray(account.wrongBook) ? account.wrongBook : [],
    examRecords: Array.isArray(account.examRecords) ? account.examRecords : [],
    settings: {
      dailyGoalMinutes: settings.dailyGoalMinutes || 90,
      ...settings,
      activeExamId: normalizeExamId(settings.activeExamId || DEFAULT_EXAM_ID),
      examSelections: normalizeExamSelections(settings),
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

function recordWrongAnswer(account, question, selected, wrongDate, context = {}) {
  const examId = normalizeExamId(context.examId || question.examId || DEFAULT_EXAM_ID);
  const majorId = context.majorId || question.majorId || null;
  const existingWrong = account.wrongBook.find((item) => wrongMatchesQuestion(item, question, examId, majorId));
  const wrongRecord = {
    questionId: question.id,
    examId,
    majorId,
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

export function getExamCategories() {
  return clone(EXAM_CATEGORIES);
}

export function getEconomistMajors() {
  return clone(ECONOMIST_MAJOR_OPTIONS);
}

export function getActiveExamContext(account) {
  const normalizedAccount = normalizeAccount(account || {});
  const examId = getAccountExamId(normalizedAccount);
  const category = getExamCategory(examId);
  const majorId = getAccountMajorId(normalizedAccount, examId);
  const major = majorId ? getEconomistMajor(majorId) : null;
  const ready = !category.requiresMajorSelection || Boolean(major);

  return {
    examId,
    category,
    majorId,
    major,
    ready,
  };
}

export function selectExamCategory(state, examId) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  account.settings.activeExamId = normalizeExamId(examId);
  if (!account.settings.examSelections) {
    account.settings.examSelections = normalizeExamSelections(account.settings);
  }
  return next;
}

export function selectEconomistMajor(state, majorId) {
  const major = getEconomistMajor(majorId);
  if (!major) {
    throw new Error(`Unknown economist specialty: ${majorId}`);
  }
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  account.settings.activeExamId = ECONOMIST_EXAM_ID;
  account.settings.examSelections = normalizeExamSelections(account.settings);
  account.settings.examSelections[ECONOMIST_EXAM_ID].majorId = major.id;
  return next;
}

export function getExamSubjects(examId = DEFAULT_EXAM_ID, majorId = null) {
  const normalizedExamId = normalizeExamId(examId);
  if (normalizedExamId === ECONOMIST_EXAM_ID) {
    const major = getEconomistMajor(majorId);
    return major ? ['全部', '经济基础知识', major.name] : [];
  }
  return ['全部', '英语', '政治', '高数（二）', '学位与论文', '行政管理'];
}

function economistMajorSubject(majorId) {
  return getEconomistMajor(majorId)?.name || '专业知识和实务';
}

function hasEnglishLetters(value) {
  return /[A-Za-z]/.test(String(value || ''));
}

function speechKindForText(value) {
  const text = String(value || '').trim();
  const wordCount = (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length;
  return wordCount <= 2 ? 'word' : 'sentence';
}

function getEconomistDailyPlan(dateString, context) {
  const majorId = context?.majorId || null;
  const major = getEconomistMajor(majorId);
  if (!major) {
    throw new Error('Economist specialty/major must be selected before generating a study plan.');
  }

  const dayOffset = Math.max(0, daysBetween(PLAN_START, dateString));
  const weekday = new Date(`${dateString}T00:00:00+08:00`).getDay();
  const beforeExam = dateToDayNumber(dateString) <= dateToDayNumber('2026-11-08');
  const professionalMinutes = major.id === ECONOMIST_DEFAULT_MAJOR_ID ? 35 : 30;

  const tasks = [
    {
      id: 'economist-foundation-daily',
      subject: '经济基础知识',
      title: '经济基础知识每日推进',
      minutes: 35,
      kind: 'daily',
      detail: '按经济学、财政、货币金融、统计、会计、法律六块轮换，先看概念再做题。',
      review: ECONOMIST_REVIEW_POINTS.foundation,
    },
    {
      id: 'economist-professional-core',
      subject: major.name,
      title: `${major.name}专业知识和实务`,
      minutes: professionalMinutes,
      kind: 'core',
      detail:
        major.id === ECONOMIST_DEFAULT_MAJOR_ID
          ? '围绕工作分析、招聘配置、绩效、薪酬、劳动关系等高频模块推进。'
          : '先建立本专业章节框架，再按官方大纲和高频概念补题库。',
      review: ECONOMIST_REVIEW_POINTS.professional,
    },
    {
      id: 'economist-wrong-review',
      subject: '经济师复习',
      title: '错题回炉与概念卡片',
      minutes: 20,
      kind: 'review',
      detail: '把错题标记为基础科目或专业科目，再写下章节和错因。',
      review: ['当天错题当天归因', '重复错题优先二刷', '专业题不要跨专业混刷'],
    },
  ];

  if (!beforeExam) {
    tasks.push({
      id: 'economist-certificate-followup',
      subject: '证书与职称',
      title: '成绩、证书和积分材料跟踪',
      minutes: 20,
      kind: 'certificate',
      detail: '关注成绩、证书下载/领取、单位聘任和积分材料要求。',
      review: ['保存报名表和成绩单', '确认职称聘任或岗位匹配材料', '关注上海人社后续通知'],
    });
  }

  if (weekday === 0) {
    tasks.push({
      id: 'economist-weekly-exam',
      subject: '周考',
      title: '经济师周考',
      minutes: 45,
      kind: 'weekly',
      detail: '经济基础 + 专业实务混合小卷，限时后集中复盘。',
      review: ECONOMIST_REVIEW_POINTS.exam,
    });
  }

  const dayOfMonth = Number(dateString.slice(8, 10));
  if (dayOfMonth >= 26 || dayOffset % 30 === 0) {
    tasks.push({
      id: 'economist-monthly-exam',
      subject: '月考',
      title: '经济师月度模拟',
      minutes: 70,
      kind: 'monthly',
      detail: '月底做两科综合模拟，统计基础科和专业科正确率差距。',
      review: ['基础科低于70%先补概念', '专业科低于70%先补专题', '把错题回流到下月计划'],
    });
  }

  return tasks;
}

export function getDailyPlan(dateString = todayString(), context = {}) {
  const examId = normalizeExamId(context.examId || DEFAULT_EXAM_ID);
  if (examId === ECONOMIST_EXAM_ID) {
    return getEconomistDailyPlan(dateString, context);
  }

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

export function completeTask(state, dateString, taskId, examId = DEFAULT_EXAM_ID, majorId = null) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const normalizedExamId = normalizeExamId(examId);
  const scopedMajorId = majorId || getAccountMajorId(account, normalizedExamId);
  const key = scopedDateKey(dateString, normalizedExamId, scopedMajorId);
  const dateProgress = account.progress[key] || { completedTaskIds: [] };
  if (!dateProgress.completedTaskIds.includes(taskId)) {
    dateProgress.completedTaskIds.push(taskId);
  }
  dateProgress.updatedAt = todayString();
  account.progress[key] = dateProgress;
  return next;
}

export function uncompleteTask(state, dateString, taskId, examId = DEFAULT_EXAM_ID, majorId = null) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const normalizedExamId = normalizeExamId(examId);
  const scopedMajorId = majorId || getAccountMajorId(account, normalizedExamId);
  const key = scopedDateKey(dateString, normalizedExamId, scopedMajorId);
  const dateProgress = account.progress[key] || { completedTaskIds: [] };
  dateProgress.completedTaskIds = dateProgress.completedTaskIds.filter((id) => id !== taskId);
  dateProgress.updatedAt = todayString();
  account.progress[key] = dateProgress;
  return next;
}

export function isTaskCompleted(account, dateString, taskId, examId = DEFAULT_EXAM_ID, majorId = null) {
  return Boolean(account?.progress?.[scopedDateKey(dateString, examId, majorId)]?.completedTaskIds?.includes(taskId));
}

export function getLessonForTask(taskId, dateString = todayString(), context = {}) {
  const examId = normalizeExamId(context.examId || DEFAULT_EXAM_ID);
  const majorId = context.majorId || null;
  const library = examId === ECONOMIST_EXAM_ID ? ECONOMIST_LESSON_LIBRARY : LESSON_LIBRARY;
  const candidates = library.filter((lesson) => {
    if (!lesson.taskIds.includes(taskId)) return false;
    const lessonExamId = lesson.examId || DEFAULT_EXAM_ID;
    if (lessonExamId !== examId) return false;
    if (examId !== ECONOMIST_EXAM_ID || !lesson.majorId) return true;
    if (lesson.majorId === majorId) return true;
    return lesson.majorId === 'generic' && majorId !== ECONOMIST_DEFAULT_MAJOR_ID;
  });
  if (candidates.length === 0) {
    throw new Error(`No lesson found for task: ${taskId}`);
  }
  const index = dateToDayNumber(dateString) % candidates.length;
  return clone(candidates[index]);
}

export function getLessonSpeechTargets(lesson) {
  if (!lesson || lesson.subject !== '英语') return [];

  const targets = [];
  (lesson.examples || []).forEach((example, index) => {
    const text = String(example.prompt || '').trim();
    if (hasEnglishLetters(text)) {
      targets.push({
        id: `example-${index}`,
        kind: 'sentence',
        label: '读句子',
        text,
      });
    }
  });

  (lesson.flashcards || []).forEach((card, index) => {
    const text = String(card.front || '').trim();
    if (hasEnglishLetters(text)) {
      targets.push({
        id: `flashcard-${index}`,
        kind: speechKindForText(text),
        label: speechKindForText(text) === 'word' ? '读单词' : '读短语',
        text,
      });
    }
  });

  return targets;
}

export function completeLesson(state, dateString, taskId, lesson, answers = {}, context = {}) {
  const next = normalizeState(clone(state));
  const account = next.accounts[requireActiveAccount(next)];
  const questions = Array.isArray(lesson.questions) ? lesson.questions : [];
  const normalizedAnswers = answers || {};
  const examId = normalizeExamId(context.examId || lesson.examId || DEFAULT_EXAM_ID);
  const majorId = context.majorId || getAccountMajorId(account, examId) || lesson.majorId || null;
  let correctCount = 0;

  const answerRecords = questions.map((question) => {
    const selected = Object.prototype.hasOwnProperty.call(normalizedAnswers, question.id)
      ? normalizedAnswers[question.id]
      : null;
    const correct = selected === question.answer;
    if (correct) {
      correctCount += 1;
    } else {
      recordWrongAnswer(account, question, selected, dateString, { examId, majorId });
    }

    return {
      questionId: question.id,
      selected,
      answer: question.answer,
      correct,
    };
  });

  const key = scopedDateKey(dateString, examId, majorId);
  const dateProgress = account.progress[key] || { completedTaskIds: [] };
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
    examId,
    majorId,
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
  account.progress[key] = dateProgress;

  return next;
}

export function buildQuiz({
  examId = DEFAULT_EXAM_ID,
  majorId = null,
  subject = '全部',
  mode = 'daily',
  count = 8,
  date = todayString(),
  questions,
  wrongQuestionIds = [],
} = {}) {
  const normalizedExamId = normalizeExamId(examId);
  const sourceQuestions =
    questions || (normalizedExamId === ECONOMIST_EXAM_ID ? ECONOMIST_QUESTION_BANK : QUESTION_BANK);
  let candidates = sourceQuestions.filter((question) => questionMatchesExam(question, normalizedExamId, majorId));
  if (subject !== '全部') {
    candidates = candidates.filter((question) => question.subject === subject);
  }

  if (mode === 'wrong') {
    const wrongSet = new Set(wrongQuestionIds);
    candidates = candidates.filter((question) => wrongSet.has(question.id));
  }

  const selected = deterministicShuffle(
    candidates,
    `${date}:${normalizedExamId}:${majorId || 'none'}:${mode}:${subject}`,
  ).slice(0, count);
  return {
    id: `${normalizedExamId}-${mode}-${subject}-${date}-${selected.map((question) => question.id).join('-')}`,
    examId: normalizedExamId,
    majorId,
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
  const examId = normalizeExamId(quiz.examId || DEFAULT_EXAM_ID);
  const majorId = quiz.majorId || null;
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
      recordWrongAnswer(account, question, selected, quiz.date || todayString(), { examId, majorId });
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
    examId,
    majorId,
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

export function getWrongBookItems(account, examId = DEFAULT_EXAM_ID, majorId = null) {
  const normalizedExamId = normalizeExamId(examId);
  return clone((account?.wrongBook || []).filter((item) => wrongMatchesExam(item, normalizedExamId, majorId)));
}

export function getStats(account, examId = DEFAULT_EXAM_ID, majorId = null) {
  const normalizedExamId = normalizeExamId(examId);
  const progressEntries = Object.entries(account?.progress || {}).filter(([key]) =>
    progressKeyMatchesScope(key, normalizedExamId, majorId),
  );
  const progressValues = progressEntries.map(([, progress]) => progress);
  const completedTaskCount = progressValues.reduce(
    (sum, progress) => sum + (progress.completedTaskIds?.length || 0),
    0,
  );
  const examRecords = (account?.examRecords || []).filter((record) => {
    const recordExamId = record.examId || DEFAULT_EXAM_ID;
    if (recordExamId !== normalizedExamId) return false;
    if (normalizedExamId !== ECONOMIST_EXAM_ID || !majorId) return true;
    return !record.majorId || record.majorId === majorId;
  });
  const wrongItems = (account?.wrongBook || []).filter((item) => wrongMatchesExam(item, normalizedExamId, majorId));
  const answerCount = examRecords.reduce((sum, record) => sum + (record.total || 0), 0);
  const correctCount = examRecords.reduce((sum, record) => sum + (record.correctCount || 0), 0);

  return {
    completedTaskCount,
    quizCount: examRecords.length,
    answerCount,
    correctCount,
    accuracy: answerCount === 0 ? 0 : Math.round((correctCount / answerCount) * 100),
    wrongCount: wrongItems.length,
    reviewPendingCount: wrongItems.filter((item) => !item.reviewed).length,
    activeDays: new Set(
      progressEntries
        .filter(([, progress]) => (progress.completedTaskIds || []).length > 0)
        .map(([key]) => unscopedDateKey(key)),
    ).size,
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
