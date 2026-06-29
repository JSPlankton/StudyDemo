import {
  buildQuiz,
  completeTask,
  createAccount,
  createInitialState,
  exportState,
  getActiveExamContext,
  getActiveAccount,
  getDailyPlan,
  getEconomistMajors,
  getExamCategories,
  getExamSubjects,
  getLessonForTask,
  getLessonSpeechTargets,
  getStats,
  getTodayString,
  getWrongBookItems,
  completeLesson,
  gradeQuiz,
  importState,
  isTaskCompleted,
  markWrongReviewed,
  selectEconomistMajor,
  selectExamCategory,
  switchAccount,
  uncompleteTask,
} from './app-core.mjs';

import {
  APP_VERSION,
  KNOWLEDGE_CARDS,
  PLAN_MILESTONES,
  QUESTION_BANK,
  SUBJECTS,
} from './content.mjs';

import { ECONOMIST_KNOWLEDGE_CARDS, ECONOMIST_PLAN_MILESTONES } from './exams.mjs';

const STORAGE_KEY = 'shnu-adult-study-plan-state-v1';
const app = document.querySelector('#app');
const profileBar = document.querySelector('#profileBar');
const bottomNav = document.querySelector('#bottomNav');
const importFile = document.querySelector('#importFile');

let startupIssue = null;
let storageIssue = null;
let state = loadState();
let view = 'today';
let selectedDate = getTodayString();
let selectedSubject = '全部';
let selectedMode = 'daily';
let currentQuiz = null;
let currentResult = null;
let currentLesson = null;
let currentLessonTaskId = null;
let lessonResult = null;
let showAddAccount = false;

const cursor = {
  year: Number(selectedDate.slice(0, 4)),
  month: Number(selectedDate.slice(5, 7)) - 1,
};

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageIssue = error instanceof Error ? error.message : '浏览器存储不可用。';
    return createInitialState(getTodayString());
  }

  if (!raw) {
    return createInitialState(getTodayString());
  }

  try {
    return importState(raw);
  } catch (error) {
    startupIssue = {
      message: error instanceof Error ? error.message : '本地进度文件无法读取。',
      raw,
    };
    return createInitialState(getTodayString());
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, exportState(state));
    storageIssue = null;
    return true;
  } catch (error) {
    storageIssue = error instanceof Error ? error.message : '浏览器存储不可用。';
    return false;
  }
}

function setState(nextState) {
  state = nextState;
  const saved = saveState();
  render();
  if (!saved) {
    window.alert(`保存失败：${storageIssue}。当前进度只在本页面临时可见，请先导出备份。`);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return map[char];
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function monthLabel(year, month) {
  return `${year}年${pad(month + 1)}月`;
}

function makeDateKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function subjectIdByName(name) {
  return SUBJECTS.find((subject) => subject.name === name)?.id || 'all';
}

function modeLabel(mode) {
  const labels = {
    daily: '日练',
    weekly: '周考',
    monthly: '月考',
    final: '模拟',
    wrong: '错题',
  };
  return labels[mode] || mode;
}

function questionCountForMode(mode) {
  if (mode === 'weekly') return 12;
  if (mode === 'monthly') return 18;
  if (mode === 'final') return 24;
  if (mode === 'wrong') return 12;
  return 8;
}

function speakEnglish(text) {
  const speech = window.speechSynthesis;
  if (!speech || typeof window.SpeechSynthesisUtterance === 'undefined') {
    window.alert('当前浏览器不支持朗读功能，可以换 Chrome、Edge 或 Safari 再试。');
    return;
  }

  speech.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  utterance.pitch = 1;
  speech.speak(utterance);
}

function activeAccount() {
  return getActiveAccount(state);
}

function activeExamContext() {
  return getActiveExamContext(activeAccount());
}

function resetTransientWork() {
  currentQuiz = null;
  currentResult = null;
  currentLesson = null;
  currentLessonTaskId = null;
  lessonResult = null;
}

function ensureSelectedSubject(context = activeExamContext()) {
  const subjects = getExamSubjects(context.examId, context.majorId);
  if (subjects.length === 0) {
    selectedSubject = '全部';
    return;
  }
  if (!subjects.includes(selectedSubject)) {
    selectedSubject = subjects[0];
  }
}

function renderBrand() {
  const account = activeAccount();
  const context = account ? activeExamContext() : null;
  const eyebrow = document.querySelector('.brand .eyebrow');
  const title = document.querySelector('.brand h1');
  if (!eyebrow || !title) return;

  eyebrow.textContent = context?.category?.name || '学习计划';
  title.textContent = context?.category?.headline || '拿证学习系统';
  document.title = context?.category?.headline
    ? `${context.category.shortName}学习计划`
    : '拿证学习计划';
}

function render() {
  renderBrand();
  renderProfile();
  renderNav();

  if (startupIssue) {
    app.innerHTML = renderRecovery();
    bottomNav.hidden = true;
    return;
  }

  if (state.accounts.length === 0) {
    app.innerHTML = renderSetup();
    bottomNav.hidden = true;
    return;
  }

  bottomNav.hidden = false;
  const context = activeExamContext();
  ensureSelectedSubject(context);
  if (!context.ready) {
    app.innerHTML = renderMajorSelection(context);
    return;
  }

  const routes = {
    today: renderToday,
    calendar: renderCalendar,
    practice: renderPractice,
    wrong: renderWrongBook,
    plan: renderPlan,
    lesson: renderLesson,
  };
  app.innerHTML = routes[view]();
}

function renderNav() {
  bottomNav.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === view);
  });
}

function renderProfile() {
  if (state.accounts.length === 0) {
    profileBar.innerHTML = '';
    return;
  }

  const account = activeAccount();
  const context = activeExamContext();
  const examOptions = getExamCategories()
    .map(
      (exam) =>
        `<option value="${escapeHtml(exam.id)}" ${exam.id === context.examId ? 'selected' : ''}>${escapeHtml(
          exam.name,
        )}</option>`,
    )
    .join('');
  const majorOptions = getEconomistMajors()
    .map(
      (major) =>
        `<option value="${escapeHtml(major.id)}" ${major.id === context.majorId ? 'selected' : ''}>${escapeHtml(
          `${major.name}${major.recommended ? '（推荐）' : ''}`,
        )}</option>`,
    )
    .join('');
  const options = state.accounts
    .map(
      (item) =>
        `<option value="${escapeHtml(item.id)}" ${item.id === state.activeAccountId ? 'selected' : ''}>${escapeHtml(
          item.name,
        )}</option>`,
    )
    .join('');

  profileBar.innerHTML = `
    <div class="profile-card">
      <label>
        当前学习账号
        <select data-action="switch-account">${options}</select>
      </label>
      <button class="secondary-button" type="button" data-action="toggle-add-account">
        ${showAddAccount ? '收起' : '新增'}
      </button>
    </div>
    ${
      showAddAccount
        ? `<form id="accountForm" class="panel inline-form">
            <input class="field" name="name" type="text" maxlength="16" placeholder="账号名称" value="">
            <button class="primary-button" type="submit">创建</button>
          </form>`
        : ''
    }
    <div class="profile-card exam-card">
      <label>
        考试分类
        <select data-action="switch-exam">${examOptions}</select>
      </label>
      ${
        context.category.requiresMajorSelection
          ? `<label>
              经济师专业
              <select data-action="select-economist-major">
                <option value="" ${context.majorId ? '' : 'selected'}>先选择专业方向</option>
                ${majorOptions}
              </select>
            </label>`
          : ''
      }
    </div>
    <p class="muted">本地账号：${escapeHtml(account?.name || '')} 的任务、考试和错题按账号与考试分类独立保存。</p>
  `;
}

function renderSetup() {
  return `
    <section class="panel setup-panel">
      <div>
        <h2>创建学习账号</h2>
        <p class="muted">适合两个人共用同一个网页，每个账号保存独立进度、错题和考试记录。</p>
      </div>
      <button class="primary-button" type="button" data-action="create-default-accounts">创建“我”和“老婆”</button>
      <button class="secondary-button" type="button" data-action="import">导入备份</button>
      <form id="accountForm" class="inline-form">
        <input class="field" name="name" type="text" maxlength="16" placeholder="账号名称">
        <button class="secondary-button" type="submit">创建账号</button>
      </form>
      <p class="muted">部署到外网后，不同手机浏览器的数据仍各自保存在本机；需要跨设备同步时再接云端登录。</p>
    </section>
  `;
}

function renderMajorSelection(context) {
  const majors = getEconomistMajors();
  return `
    <section class="panel setup-panel">
      <div>
        <h2>先选择经济师专业方向</h2>
        <p class="muted">中级经济师是《经济基础知识》加一个《专业知识和实务》方向。选择后，系统才会生成对应专业的每日计划、课程和题库。</p>
      </div>
      <div class="major-grid">
        ${majors
          .map(
            (major) => `
              <button class="major-card ${major.recommended ? 'is-recommended' : ''}" type="button" data-action="select-major-card" data-major-id="${escapeHtml(major.id)}">
                <span class="tag ${major.recommended ? 'primary' : ''}">${major.recommended ? '默认推荐' : '可选方向'}</span>
                <b>${escapeHtml(major.name)}</b>
                <small>${escapeHtml(major.difficulty)}</small>
                <span>${escapeHtml(major.note)}</span>
              </button>
            `,
          )
          .join('')}
      </div>
      <p class="muted">我的建议：如果主要目标是稳妥拿中级职称，人力资源管理更适合作为默认方向；如果你的工作证明更偏财税、金融、建筑等，再选择对应专业。</p>
    </section>
  `;
}

function renderRecovery() {
  return `
    <section class="panel setup-panel">
      <div>
        <h2>本地进度需要处理</h2>
        <p class="muted">浏览器里的学习进度无法自动读取，系统没有覆盖原始数据。请先下载原始数据，或导入一份正常备份。</p>
      </div>
      <div class="result-panel">
        <h3>读取失败</h3>
        <p class="muted">${escapeHtml(startupIssue.message)}</p>
      </div>
      <div class="button-row">
        <button class="primary-button" type="button" data-action="export-raw-state">下载原始数据</button>
        <button class="secondary-button" type="button" data-action="import">导入正常备份</button>
        <button class="danger-button" type="button" data-action="discard-bad-state">清除并重新开始</button>
      </div>
    </section>
  `;
}

function renderToday() {
  const account = activeAccount();
  const context = activeExamContext();
  const plan = getDailyPlan(selectedDate, context);
  const stats = getStats(account, context.examId, context.majorId);
  const doneCount = plan.filter((task) =>
    isTaskCompleted(account, selectedDate, task.id, context.examId, context.majorId),
  ).length;
  const percent = plan.length === 0 ? 0 : Math.round((doneCount / plan.length) * 100);

  return `
    ${renderExamShortcut(context)}
    <section class="panel">
      <div class="section-head">
        <div>
          <h2>今日任务</h2>
          <p class="muted">${escapeHtml(selectedDate)}，${escapeHtml(context.category.shortName)}学习计划。</p>
        </div>
        <input class="date-field" type="date" data-action="date-input" value="${escapeHtml(selectedDate)}">
      </div>
      <div class="hero-stats">
        ${renderStat(`${doneCount}/${plan.length}`, '今日完成')}
        ${renderStat(`${stats.accuracy}%`, '答题正确率')}
        ${renderStat(`${stats.reviewPendingCount}`, '待复习错题')}
      </div>
      <div class="progress-bar" aria-label="今日进度"><span style="--value:${percent}%"></span></div>
    </section>
    <section class="task-list">
      ${plan.map((task) => renderTaskCard(task, account)).join('')}
    </section>
  `;
}

function renderStat(value, label) {
  return `<div class="stat-card"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`;
}

function renderExamShortcut(context) {
  const exams = getExamCategories();
  return `
    <section class="panel exam-shortcut">
      <div class="section-head">
        <div>
          <h2>学习分类</h2>
          <p class="muted">当前：${escapeHtml(context.category.name)}${context.major ? ` / ${escapeHtml(context.major.name)}` : ''}</p>
        </div>
      </div>
      <div class="exam-switch-grid">
        ${exams
          .map(
            (exam) => `
              <button class="exam-switch-card ${exam.id === context.examId ? 'is-active' : ''}" type="button" data-action="switch-exam-card" data-exam-id="${escapeHtml(exam.id)}">
                <b>${escapeHtml(exam.shortName)}</b>
                <span>${escapeHtml(exam.detail)}</span>
              </button>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderTaskCard(task, account) {
  const context = activeExamContext();
  const checked = isTaskCompleted(account, selectedDate, task.id, context.examId, context.majorId);
  const tagClass = task.subject === '英语' ? 'primary' : task.subject === '高数（二）' ? 'blue' : 'orange';
  const points = (task.review || []).slice(0, 3);

  return `
    <article class="task-card">
      <input type="checkbox" data-action="toggle-task" data-task-id="${escapeHtml(task.id)}" ${checked ? 'checked' : ''}>
      <div>
        <div class="task-meta">
          <span class="tag ${tagClass}">${escapeHtml(task.subject)}</span>
          <span class="tag">${escapeHtml(String(task.minutes))}分钟</span>
        </div>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.detail)}</p>
        ${points.length ? `<ul class="review-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>` : ''}
        <div class="button-row">
          <button class="primary-button" type="button" data-action="open-lesson" data-task-id="${escapeHtml(task.id)}">开始学习</button>
        </div>
      </div>
    </article>
  `;
}

function renderLesson() {
  if (!currentLesson || !currentLessonTaskId) {
    return `
      <section class="panel">
        <h2>课程未选择</h2>
        <button class="secondary-button" type="button" data-action="back-today">返回今日</button>
      </section>
    `;
  }

  const objectives = currentLesson.objectives || [];
  const sections = currentLesson.sections || [];
  const examples = currentLesson.examples || [];
  const flashcards = currentLesson.flashcards || [];
  const questions = currentLesson.questions || [];
  const speechTargets = getLessonSpeechTargets(currentLesson);

  return `
    <section class="panel lesson-hero">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(currentLesson.title)}</h2>
          <p class="muted">${escapeHtml(currentLesson.subject)} · ${escapeHtml(currentLesson.minutes)}分钟 · ${escapeHtml(selectedDate)}</p>
        </div>
        <button class="secondary-button" type="button" data-action="back-today">返回</button>
      </div>
      <p class="muted">${escapeHtml(currentLesson.sourceNote || '原创学习笔记，仅供个人备考学习。')}</p>
      ${
        objectives.length
          ? `<div class="tag-row">${objectives.map((item) => `<span class="tag primary">${escapeHtml(item)}</span>`).join('')}</div>`
          : ''
      }
    </section>
    <section class="lesson-stack">
      ${sections.map(renderLessonSection).join('')}
      ${examples.length ? renderLessonExamples(examples, speechTargets) : ''}
      ${flashcards.length ? renderFlashcards(flashcards, speechTargets) : ''}
    </section>
    ${lessonResult ? renderLessonResult(lessonResult) : ''}
    ${questions.length ? renderLessonQuestions(currentLesson) : '<section class="empty">本课暂无随堂题。</section>'}
  `;
}

function renderLessonSection(section) {
  return `
    <article class="lesson-block">
      <h3>${escapeHtml(section.heading)}</h3>
      <p>${escapeHtml(section.body)}</p>
      ${
        section.bullets?.length
          ? `<ul class="review-points">${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
          : ''
      }
    </article>
  `;
}

function renderSpeechButton(target) {
  if (!target) return '';
  return `
    <button class="speech-button" type="button" data-action="speak-text" data-speech-text="${escapeHtml(target.text)}" aria-label="${escapeHtml(target.label)}：${escapeHtml(target.text)}">
      <span aria-hidden="true">▶</span>
      <span>${escapeHtml(target.label)}</span>
    </button>
  `;
}

function renderLessonExamples(examples, speechTargets = []) {
  return `
    <article class="lesson-block">
      <h3>例题</h3>
      ${examples
        .map(
          (example, index) => {
            const speechTarget = speechTargets.find((target) => target.id === `example-${index}`);
            return `
              <div class="example-box">
                <div class="lesson-line-action">
                  <b>${escapeHtml(example.prompt)}</b>
                  ${renderSpeechButton(speechTarget)}
                </div>
                <p>${escapeHtml(example.explanation)}</p>
              </div>
            `;
          },
        )
        .join('')}
    </article>
  `;
}

function renderFlashcards(cards, speechTargets = []) {
  return `
    <article class="lesson-block">
      <h3>记忆卡片</h3>
      <div class="flashcard-grid">
        ${cards
          .map(
            (card, index) => {
              const speechTarget = speechTargets.find((target) => target.id === `flashcard-${index}`);
              return `
                <div class="flashcard">
                  <div class="lesson-line-action">
                    <b>${escapeHtml(card.front)}</b>
                    ${renderSpeechButton(speechTarget)}
                  </div>
                  <span>${escapeHtml(card.back)}</span>
                </div>
              `;
            },
          )
          .join('')}
      </div>
    </article>
  `;
}

function renderLessonQuestions(lesson) {
  return `
    <form id="lessonForm" class="question-list">
      <section class="panel">
        <h2>随堂练习</h2>
        <p class="muted">提交后会记录到当前账号，并把错题加入错题本。</p>
      </section>
      ${lesson.questions.map((question, index) => renderQuestion(question, index)).join('')}
      <button class="primary-button" type="submit">提交本课</button>
    </form>
  `;
}

function renderLessonResult(record) {
  return `
    <section class="result-panel">
      <h3>本课得分：${escapeHtml(record.score)}分</h3>
      <p class="muted">答对 ${escapeHtml(record.correctCount)}/${escapeHtml(record.total)}，今日任务已自动记录。</p>
    </section>
  `;
}

function renderCalendar() {
  const account = activeAccount();
  const context = activeExamContext();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const blanks = Array.from({ length: firstWeekday }, () => '<div></div>').join('');
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateKey = makeDateKey(cursor.year, cursor.month, day);
    const plan = getDailyPlan(dateKey, context);
    const completed = plan.filter((task) =>
      isTaskCompleted(account, dateKey, task.id, context.examId, context.majorId),
    ).length;
    const done = plan.length > 0 && completed >= plan.length;
    return `
      <button class="day-button ${done ? 'is-done' : ''} ${dateKey === selectedDate ? 'is-selected' : ''}" type="button" data-action="select-date" data-date="${dateKey}">
        <span>${day}</span>
        <small>${completed}/${plan.length}</small>
      </button>
    `;
  }).join('');

  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2>学习日历</h2>
          <p class="muted">${escapeHtml(monthLabel(cursor.year, cursor.month))}</p>
        </div>
        <div class="button-row">
          <button class="secondary-button" type="button" data-action="month-prev">上月</button>
          <button class="secondary-button" type="button" data-action="month-next">下月</button>
        </div>
      </div>
      <div class="calendar-grid">
        ${weekdays.map((day) => `<div class="weekday">${day}</div>`).join('')}
        ${blanks}
        ${days}
      </div>
    </section>
  `;
}

function renderPractice() {
  const account = activeAccount();
  const context = activeExamContext();
  const wrongItems = getWrongBookItems(account, context.examId, context.majorId);
  const wrongIds = wrongItems.map((item) => item.questionId);
  const canStartWrong = wrongIds.length > 0;
  const bankLabel =
    context.examId === 'economist-intermediate-2026'
      ? `${context.major?.name || '所选专业'}经济师种子题`
      : `${QUESTION_BANK.length}道种子题`;

  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2>题库与考试</h2>
          <p class="muted">${escapeHtml(bankLabel)}，后续可以继续扩充。</p>
        </div>
        <button class="primary-button" type="button" data-action="start-quiz" ${selectedMode === 'wrong' && !canStartWrong ? 'disabled' : ''}>
          开始
        </button>
      </div>
      ${renderQuizControls(canStartWrong, context)}
    </section>
    ${currentResult ? renderQuizResult(currentResult) : ''}
    ${currentQuiz ? renderQuizForm(currentQuiz) : ''}
  `;
}

function renderQuizControls(canStartWrong, context = activeExamContext()) {
  const subjects = getExamSubjects(context.examId, context.majorId);
  const modes = ['daily', 'weekly', 'monthly', 'final', 'wrong'];
  return `
    <div class="stack">
      <div class="segmented" aria-label="科目">
        ${subjects
          .map(
            (subject) =>
              `<button type="button" data-action="choose-subject" data-subject="${escapeHtml(subject)}" class="${
                subject === selectedSubject ? 'is-active' : ''
              }">${escapeHtml(subject)}</button>`,
          )
          .join('')}
      </div>
      <div class="segmented" aria-label="模式">
        ${modes
          .map((mode) => {
            const disabled = mode === 'wrong' && !canStartWrong ? 'disabled' : '';
            return `<button type="button" data-action="choose-mode" data-mode="${mode}" class="${
              mode === selectedMode ? 'is-active' : ''
            }" ${disabled}>${escapeHtml(modeLabel(mode))}</button>`;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderQuizResult(record) {
  return `
    <section class="result-panel">
      <h3>${escapeHtml(modeLabel(record.mode))}结果：${escapeHtml(record.score)}分</h3>
      <p class="muted">${escapeHtml(record.subject)}，答对 ${escapeHtml(record.correctCount)}/${escapeHtml(record.total)}。</p>
    </section>
  `;
}

function renderQuizForm(quiz) {
  if (quiz.questions.length === 0) {
    return `<section class="empty">当前条件下没有可用题目。</section>`;
  }

  return `
    <form id="quizForm" class="question-list">
      ${quiz.questions.map((question, index) => renderQuestion(question, index)).join('')}
      <button class="primary-button" type="submit">交卷</button>
    </form>
  `;
}

function renderQuestion(question, index) {
  return `
    <article class="question-card">
      <div class="task-meta">
        <span class="tag primary">${escapeHtml(question.subject)}</span>
        ${(question.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <h3>${index + 1}. ${escapeHtml(question.prompt)}</h3>
      <div class="option-list">
        ${question.options
          .map(
            (option, optionIndex) => `
              <label class="option-item">
                <input type="radio" name="${escapeHtml(question.id)}" value="${optionIndex}">
                <span>${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</span>
              </label>
            `,
          )
          .join('')}
      </div>
    </article>
  `;
}

function renderWrongBook() {
  const account = activeAccount();
  const context = activeExamContext();
  const stats = getStats(account, context.examId, context.majorId);
  const items = getWrongBookItems(account, context.examId, context.majorId).reverse();

  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <h2>错题本</h2>
          <p class="muted">待复习 ${escapeHtml(stats.reviewPendingCount)} 题，累计错题 ${escapeHtml(stats.wrongCount)} 题。</p>
        </div>
        <button class="secondary-button" type="button" data-action="practice-wrong" ${items.length ? '' : 'disabled'}>错题练习</button>
      </div>
    </section>
    ${
      items.length
        ? `<section class="wrong-list">${items.map((item) => renderWrongCard(item)).join('')}</section>`
        : '<section class="empty">暂无错题。</section>'
    }
  `;
}

function renderWrongCard(item) {
  const answerText = item.options?.[item.answer] ?? item.answer;
  const selectedText = item.selected === null ? '未作答' : item.options?.[item.selected] ?? item.selected;
  return `
    <article class="wrong-card">
      <div class="task-meta">
        <span class="tag primary">${escapeHtml(item.subject)}</span>
        <span class="tag ${item.reviewed ? 'blue' : 'orange'}">${item.reviewed ? '已复习' : '待复习'}</span>
      </div>
      <h3>${escapeHtml(item.prompt)}</h3>
      <p>你的答案：${escapeHtml(selectedText)}；正确答案：${escapeHtml(answerText)}</p>
      <p>${escapeHtml(item.explanation)}</p>
      <div class="button-row">
        <button class="secondary-button" type="button" data-action="mark-reviewed" data-wrong-id="${escapeHtml(item.id)}" ${
          item.reviewed ? 'disabled' : ''
        }>标记已复习</button>
      </div>
    </article>
  `;
}

function renderPlan() {
  const account = activeAccount();
  const context = activeExamContext();
  const stats = getStats(account, context.examId, context.majorId);
  const milestones =
    context.examId === 'economist-intermediate-2026' ? ECONOMIST_PLAN_MILESTONES : PLAN_MILESTONES;
  const cards = context.examId === 'economist-intermediate-2026' ? ECONOMIST_KNOWLEDGE_CARDS : KNOWLEDGE_CARDS;
  return `
    <section class="panel">
      <h2>进度统计</h2>
      <div class="stats-grid">
        ${renderStat(stats.completedTaskCount, '完成任务')}
        ${renderStat(stats.quizCount, '考试练习')}
        ${renderStat(`${stats.accuracy}%`, '总正确率')}
      </div>
    </section>
    <section class="panel">
      <h2>拿证计划表</h2>
      <div class="milestone-list">
        ${milestones.map(
          (item) => `
            <article class="milestone">
              <div class="task-meta">
                <span class="tag primary">${escapeHtml(item.date)}</span>
                <span class="tag">${escapeHtml(item.title)}</span>
              </div>
              <p>${escapeHtml(item.detail)}</p>
            </article>
          `,
        ).join('')}
      </div>
    </section>
    <section class="panel">
      <h2>复习要点</h2>
      <div class="knowledge-list">
        ${cards.map(renderKnowledgeCard).join('')}
      </div>
    </section>
    <section class="panel">
      <h2>备份与资料</h2>
      <div class="button-row">
        <button class="primary-button" type="button" data-action="export">导出进度</button>
        <button class="secondary-button" type="button" data-action="import">导入进度</button>
      </div>
      <p class="muted">版本 ${escapeHtml(APP_VERSION)}。官方报名、缴费、考试、录取、成绩和证书规则以当年官方公告为准。</p>
    </section>
  `;
}

function renderKnowledgeCard(card) {
  const cardCode = card.examId === 'economist-intermediate-2026' ? 'economist' : subjectIdByName(card.subject);
  return `
    <article class="knowledge-card">
      <div class="task-meta">
        <span class="tag primary">${escapeHtml(card.subject)}</span>
        <span class="tag">${escapeHtml(cardCode)}</span>
      </div>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
      <ul class="review-points">
        ${card.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
    </article>
  `;
}

function createDefaultAccounts() {
  let next = createAccount(state, '我');
  const firstId = next.activeAccountId;
  next = createAccount(next, '老婆');
  next = switchAccount(next, firstId);
  setState(next);
}

function openLesson(taskId) {
  const context = activeExamContext();
  currentLessonTaskId = taskId;
  currentLesson = getLessonForTask(taskId, selectedDate, context);
  lessonResult = null;
  currentQuiz = null;
  currentResult = null;
  view = 'lesson';
  render();
}

function startQuiz() {
  const account = activeAccount();
  const context = activeExamContext();
  const wrongQuestionIds = getWrongBookItems(account, context.examId, context.majorId).map((item) => item.questionId);
  currentQuiz = buildQuiz({
    examId: context.examId,
    majorId: context.majorId,
    subject: selectedSubject,
    mode: selectedMode,
    count: questionCountForMode(selectedMode),
    date: selectedDate,
    wrongQuestionIds,
  });
  currentResult = null;
  render();
}

function submitLesson(form) {
  if (!currentLesson || !currentLessonTaskId) return;
  const context = activeExamContext();
  const data = new FormData(form);
  const answers = {};
  currentLesson.questions.forEach((question) => {
    const value = data.get(question.id);
    if (value !== null) {
      answers[question.id] = Number(value);
    }
  });

  const next = completeLesson(state, selectedDate, currentLessonTaskId, currentLesson, answers, context);
  const account = getActiveAccount(next);
  const progressKey =
    context.examId === 'adult-undergraduate'
      ? selectedDate
      : `${context.examId}:${context.majorId || 'unselected'}:${selectedDate}`;
  const records = account.progress?.[progressKey]?.lessonRecords || [];
  lessonResult = [...records].reverse().find(
    (record) => record.taskId === currentLessonTaskId && record.lessonId === currentLesson.id,
  ) || null;
  setState(next);
}

function submitQuiz(form) {
  if (!currentQuiz) return;
  const data = new FormData(form);
  const answers = {};
  currentQuiz.questions.forEach((question) => {
    const value = data.get(question.id);
    if (value !== null) {
      answers[question.id] = Number(value);
    }
  });
  const next = gradeQuiz(state, currentQuiz, answers);
  const account = getActiveAccount(next);
  currentResult = account.examRecords[account.examRecords.length - 1];
  currentQuiz = null;
  setState(next);
}

function downloadText(content, filename, type = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadState() {
  downloadText(exportState(state), `上海师大成考学习进度-${selectedDate}.json`);
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const imported = importState(String(reader.result));
      try {
        localStorage.setItem(`${STORAGE_KEY}-before-import`, exportState(state));
      } catch {
        // The visible import still succeeds; the user can also export manually.
      }
      state = imported;
      startupIssue = null;
      const saved = saveState();
      currentQuiz = null;
      currentResult = null;
      render();
      if (!saved) {
        window.alert(`导入成功但保存失败：${storageIssue}。请立即导出备份。`);
      }
    } catch {
      app.insertAdjacentHTML('afterbegin', '<section class="empty">导入失败：备份文件格式不正确。</section>');
    }
  });
  reader.readAsText(file, 'utf-8');
}

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    view = viewButton.dataset.view;
    resetTransientWork();
    render();
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;

  if (action === 'create-default-accounts') {
    createDefaultAccounts();
  }

  if (action === 'toggle-add-account') {
    showAddAccount = !showAddAccount;
    render();
  }

  if (action === 'export') {
    downloadState();
  }

  if (action === 'import') {
    importFile.click();
  }

  if (action === 'select-major-card') {
    selectedSubject = '全部';
    resetTransientWork();
    setState(selectEconomistMajor(state, button.dataset.majorId));
  }

  if (action === 'switch-exam-card') {
    selectedSubject = '全部';
    resetTransientWork();
    setState(selectExamCategory(state, button.dataset.examId));
  }

  if (action === 'speak-text') {
    speakEnglish(button.dataset.speechText || '');
  }

  if (action === 'export-raw-state') {
    downloadText(
      startupIssue?.raw || '',
      `上海师大成考学习进度-无法导入原始数据-${selectedDate}.json`,
      'application/json;charset=utf-8',
    );
  }

  if (action === 'discard-bad-state') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory reset still lets the user export a fresh backup.
    }
    startupIssue = null;
    state = createInitialState(getTodayString());
    saveState();
    render();
  }

  if (action === 'select-date') {
    selectedDate = button.dataset.date;
    view = 'today';
    render();
  }

  if (action === 'month-prev') {
    cursor.month -= 1;
    if (cursor.month < 0) {
      cursor.month = 11;
      cursor.year -= 1;
    }
    render();
  }

  if (action === 'month-next') {
    cursor.month += 1;
    if (cursor.month > 11) {
      cursor.month = 0;
      cursor.year += 1;
    }
    render();
  }

  if (action === 'choose-subject') {
    selectedSubject = button.dataset.subject;
    resetTransientWork();
    render();
  }

  if (action === 'choose-mode') {
    selectedMode = button.dataset.mode;
    resetTransientWork();
    render();
  }

  if (action === 'start-quiz') {
    startQuiz();
  }

  if (action === 'open-lesson') {
    openLesson(button.dataset.taskId);
  }

  if (action === 'back-today') {
    view = 'today';
    currentLesson = null;
    currentLessonTaskId = null;
    lessonResult = null;
    render();
  }

  if (action === 'practice-wrong') {
    selectedMode = 'wrong';
    view = 'practice';
    startQuiz();
  }

  if (action === 'mark-reviewed') {
    setState(markWrongReviewed(state, button.dataset.wrongId, true));
  }
});

document.addEventListener('change', (event) => {
  const target = event.target;
  const action = target.dataset.action;

  if (action === 'switch-account') {
    resetTransientWork();
    selectedSubject = '全部';
    setState(switchAccount(state, target.value));
  }

  if (action === 'switch-exam') {
    resetTransientWork();
    selectedSubject = '全部';
    setState(selectExamCategory(state, target.value));
  }

  if (action === 'select-economist-major' && target.value) {
    resetTransientWork();
    selectedSubject = '全部';
    setState(selectEconomistMajor(state, target.value));
  }

  if (action === 'date-input') {
    selectedDate = target.value || getTodayString();
    cursor.year = Number(selectedDate.slice(0, 4));
    cursor.month = Number(selectedDate.slice(5, 7)) - 1;
    render();
  }

  if (action === 'toggle-task') {
    const context = activeExamContext();
    const next = target.checked
      ? completeTask(state, selectedDate, target.dataset.taskId, context.examId, context.majorId)
      : uncompleteTask(state, selectedDate, target.dataset.taskId, context.examId, context.majorId);
    setState(next);
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id === 'accountForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    showAddAccount = false;
    setState(createAccount(state, data.get('name')));
  }

  if (event.target.id === 'quizForm') {
    event.preventDefault();
    submitQuiz(event.target);
  }

  if (event.target.id === 'lessonForm') {
    event.preventDefault();
    submitLesson(event.target);
  }
});

importFile.addEventListener('change', () => {
  importBackup(importFile.files?.[0]);
  importFile.value = '';
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  let refreshedForServiceWorker = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshedForServiceWorker) return;
    refreshedForServiceWorker = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    registration.update();
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch(() => {});
}

render();
