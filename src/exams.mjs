export const DEFAULT_EXAM_ID = 'adult-undergraduate';
export const ECONOMIST_EXAM_ID = 'economist-intermediate-2026';
export const ECONOMIST_DEFAULT_MAJOR_ID = 'human-resources';

export const ECONOMIST_MAJOR_OPTIONS = [
  {
    id: 'human-resources',
    name: '人力资源管理',
    recommended: true,
    difficulty: '记忆理解为主，计算少',
    note: '默认推荐。适合以稳妥取证、职称积分、通用岗位适配为目标的备考。',
  },
  {
    id: 'business',
    name: '工商管理',
    difficulty: '覆盖面广，案例理解多',
    note: '通用度高，适合企业管理、运营、行政、综合岗位。',
  },
  {
    id: 'finance',
    name: '金融',
    difficulty: '术语和计算更多',
    note: '适合银行、证券、保险、投融资相关工作背景。',
  },
  {
    id: 'fiscal-tax',
    name: '财政税收',
    difficulty: '政策细节多',
    note: '适合财税、会计、财政、税务相关工作背景。',
  },
  {
    id: 'intellectual-property',
    name: '知识产权',
    difficulty: '规则记忆多',
    note: '适合法务、研发管理、知识产权服务相关工作背景。',
  },
  {
    id: 'agriculture',
    name: '农业经济',
    difficulty: '行业背景要求较强',
    note: '适合农业、乡村振兴、涉农项目相关工作背景。',
  },
  {
    id: 'insurance',
    name: '保险',
    difficulty: '专业条款较多',
    note: '适合保险公司、经纪、风控、理赔相关工作背景。',
  },
  {
    id: 'transport',
    name: '运输经济',
    difficulty: '行业模型较多',
    note: '适合物流、交通、供应链、运输企业相关工作背景。',
  },
  {
    id: 'tourism',
    name: '旅游经济',
    difficulty: '场景理解多',
    note: '适合文旅、酒店、景区、服务业相关工作背景。',
  },
  {
    id: 'construction-real-estate',
    name: '建筑与房地产经济',
    difficulty: '项目和法规细节多',
    note: '适合建筑、房地产、工程项目、造价相关工作背景。',
  },
];

export const EXAM_CATEGORIES = [
  {
    id: DEFAULT_EXAM_ID,
    name: '上海师范大学成考专升本',
    shortName: '专升本',
    headline: '行政管理拿证计划',
    detail: '英语每日必学，政治和高数（二）轮换，入学后继续跟踪毕业证与学位证风险。',
    requiresMajorSelection: false,
  },
  {
    id: ECONOMIST_EXAM_ID,
    name: '2026 中级经济师中级职称考试',
    shortName: '中级经济师',
    headline: '经济基础知识 + 专业知识和实务',
    detail: '先选择一个专业方向，再生成经济基础与专业实务的每日计划、题库、错题和统计。',
    requiresMajorSelection: true,
    defaultMajorId: ECONOMIST_DEFAULT_MAJOR_ID,
  },
];

export const ECONOMIST_REVIEW_POINTS = {
  foundation: [
    '经济基础知识覆盖面广，先建立“经济学、财政、货币金融、统计、会计、法律”六块框架。',
    '选择题要靠概念边界，遇到相近概念时写下“区别词”。',
    '每天少量刷题，错题按章节归类，避免只记答案。',
  ],
  professional: [
    '专业知识和实务要围绕所选专业，不要跨专业混刷。',
    '案例题先找主体、情境、考点，再排除明显不符合管理逻辑的选项。',
    '同一专业的高频概念要做成卡片反复刷。',
  ],
  exam: [
    '两科均为客观题，训练时先限时，再看解析。',
    '每周做一次小卷，每月底做一次综合卷。',
    '报名、缴费、准考证和考试批次以中国人事考试网和上海职业能力考试院通知为准。',
  ],
};

export const ECONOMIST_PLAN_MILESTONES = [
  {
    date: '2026-06-29',
    title: '启动与选专业',
    detail: '先确定中级经济师专业方向。系统默认推荐人力资源管理，但报名时最终要结合工作岗位匹配度。',
  },
  {
    date: '2026-07-01',
    title: '基础框架期',
    detail: '经济基础知识每天推进，专业实务隔天强化，先把两科目录和核心概念搭起来。',
  },
  {
    date: '2026-07-15',
    title: '考试通知窗口',
    detail: '上海市职业能力考试院2026计划表预计7月中旬发布初中级经济师考试通知。',
  },
  {
    date: '2026-07-25',
    title: '预计报名窗口',
    detail: '上海2026计划表预计7月下旬报名，最终以当年考务通知和中国人事考试网报名系统为准。',
  },
  {
    date: '2026-08-15',
    title: '强化刷题期',
    detail: '开始章节题和错题回炉，经济基础按六大模块轮换，专业实务按所选专业专题推进。',
  },
  {
    date: '2026-10-01',
    title: '冲刺模拟期',
    detail: '每周至少一套两科混合模拟，重点提高机考节奏和连续作答稳定性。',
  },
  {
    date: '2026-11-07',
    title: '考试周',
    detail: '上海2026计划表列出初级、中级经济专业技术资格考试日期为11月7日、8日。',
  },
  {
    date: '2026-12-05',
    title: '预计成绩窗口',
    detail: '上海2026计划表预计12月上旬公布成绩，后续关注证书领取和职称聘任/积分材料要求。',
  },
];

export const ECONOMIST_KNOWLEDGE_CARDS = [
  {
    id: 'econ-official-channel',
    examId: ECONOMIST_EXAM_ID,
    subject: '报名',
    title: '只走官方报名入口',
    body: '除会计、软考等少数考试外，上海计划表提示其余考试报名网站均为中国人事考试网。经济师报名、缴费、准考证和成绩以官方通知为准。',
    points: ['关注上海职业能力考试院“考务安排”', '报名入口以中国人事考试网为准', '不要相信包过、免考、代报名承诺'],
  },
  {
    id: 'econ-subject-structure',
    examId: ECONOMIST_EXAM_ID,
    subject: '科目',
    title: '中级经济师是公共科目 + 专业科目',
    body: '初级、中级经济专业技术资格考试均设《经济基础知识》和《专业知识和实务》两个科目，专业实务按10个专业类别命题。',
    points: ['经济基础知识是公共科目', '专业知识和实务按所选专业命题', '两科都要纳入每日计划'],
  },
  {
    id: 'econ-major-choice',
    examId: ECONOMIST_EXAM_ID,
    subject: '专业选择',
    title: '默认推荐人力资源管理',
    body: '如果目标是稳妥拿中级职称并用于积分材料，人力资源管理通常更偏记忆理解，计算压力较低。但最终专业最好与实际工作或可证明岗位相匹配。',
    points: ['稳妥优先：人力资源管理', '通用岗位：工商管理', '财税金融岗位再考虑财政税收或金融'],
  },
];

export const ECONOMIST_LESSON_LIBRARY = [
  {
    id: 'econ-foundation-lesson-001',
    examId: ECONOMIST_EXAM_ID,
    taskIds: ['economist-foundation-daily'],
    subject: '经济基础知识',
    title: '需求、供给与均衡价格',
    minutes: 35,
    sourceNote: '原创学习笔记；按中级经济师《经济基础知识》常见框架整理，仅供个人备考。',
    objectives: ['理解需求曲线方向', '区分需求变动和需求量变动', '完成2道随堂题'],
    sections: [
      {
        heading: '核心概念',
        body: '需求表示消费者在不同价格水平下愿意并且能够购买的数量。一般情况下，价格上升，需求量下降；价格下降，需求量上升。',
        bullets: ['价格变化：沿着需求曲线移动', '收入、偏好等变化：需求曲线移动', '供给与需求共同决定均衡价格'],
      },
    ],
    examples: [{ prompt: '收入增加导致正常品购买增加', explanation: '这通常是需求增加，表现为需求曲线向右移动。' }],
    flashcards: [
      { front: '需求量变动', back: '由商品自身价格变化引起' },
      { front: '需求变动', back: '由收入、偏好、相关商品价格等因素引起' },
    ],
    questions: [
      {
        id: 'lesson-econ-foundation-001-q1',
        examId: ECONOMIST_EXAM_ID,
        subject: '经济基础知识',
        prompt: '一般情况下，商品价格上升会导致该商品的：',
        options: ['需求量减少', '需求量增加', '供给量减少', '需求曲线必然右移'],
        answer: 0,
        explanation: '价格上升通常导致需求量减少，这是沿需求曲线移动。',
        tags: ['微观经济'],
      },
      {
        id: 'lesson-econ-foundation-001-q2',
        examId: ECONOMIST_EXAM_ID,
        subject: '经济基础知识',
        prompt: '消费者收入提高导致正常品购买意愿增加，通常称为：',
        options: ['需求增加', '需求量减少', '供给减少', '价格管制'],
        answer: 0,
        explanation: '收入变化引起整条需求曲线移动，属于需求变动。',
        tags: ['微观经济'],
      },
    ],
  },
  {
    id: 'econ-foundation-lesson-002',
    examId: ECONOMIST_EXAM_ID,
    taskIds: ['economist-foundation-daily'],
    subject: '经济基础知识',
    title: '财政政策与货币政策的识别',
    minutes: 35,
    sourceNote: '原创学习笔记；围绕中级经济师基础科目高频政策工具整理。',
    objectives: ['区分财政政策工具', '区分货币政策工具', '完成2道随堂题'],
    sections: [
      {
        heading: '识别方法',
        body: '财政政策主体通常是政府财政部门，工具包括税收、政府支出、转移支付、国债等；货币政策主体通常是中央银行，工具包括法定存款准备金率、再贴现、公开市场操作等。',
        bullets: ['看到税收、预算、政府支出：优先想财政政策', '看到央行、利率、准备金：优先想货币政策', '扩张性政策通常刺激总需求'],
      },
    ],
    examples: [{ prompt: '降低法定存款准备金率', explanation: '这是货币政策工具，通常会增加商业银行可贷资金。' }],
    flashcards: [
      { front: '财政政策工具', back: '税收、政府支出、转移支付、国债' },
      { front: '货币政策工具', back: '准备金率、再贴现、公开市场操作' },
    ],
    questions: [
      {
        id: 'lesson-econ-foundation-002-q1',
        examId: ECONOMIST_EXAM_ID,
        subject: '经济基础知识',
        prompt: '下列属于货币政策工具的是：',
        options: ['法定存款准备金率', '政府采购', '所得税', '财政补贴'],
        answer: 0,
        explanation: '法定存款准备金率由中央银行调节，属于货币政策工具。',
        tags: ['宏观经济'],
      },
      {
        id: 'lesson-econ-foundation-002-q2',
        examId: ECONOMIST_EXAM_ID,
        subject: '经济基础知识',
        prompt: '下列更接近财政政策的是：',
        options: ['增加政府公共支出', '调整再贴现率', '公开市场买卖债券', '调整存款准备金率'],
        answer: 0,
        explanation: '政府公共支出属于财政政策工具。',
        tags: ['财政'],
      },
    ],
  },
  {
    id: 'econ-hr-lesson-001',
    examId: ECONOMIST_EXAM_ID,
    majorId: 'human-resources',
    taskIds: ['economist-professional-core'],
    subject: '人力资源管理',
    title: '工作分析与招聘配置',
    minutes: 35,
    sourceNote: '原创学习笔记；按中级经济师人力资源管理专业常见考点整理。',
    objectives: ['理解工作分析作用', '掌握招聘配置基本流程', '完成2道随堂题'],
    sections: [
      {
        heading: '工作分析是入口',
        body: '工作分析要明确岗位职责、任职资格、工作条件和绩效标准。招聘、培训、绩效、薪酬都应以岗位信息为基础。',
        bullets: ['岗位说明书：工作内容和职责', '任职资格：知识、技能、能力和经验', '招聘配置要追求人岗匹配'],
      },
    ],
    examples: [{ prompt: '招聘前先确定岗位职责', explanation: '这是通过工作分析明确用人标准，减少错配。' }],
    flashcards: [
      { front: '工作分析产出', back: '岗位说明书、任职资格' },
      { front: '招聘核心', back: '人岗匹配' },
    ],
    questions: [
      {
        id: 'lesson-econ-hr-001-q1',
        examId: ECONOMIST_EXAM_ID,
        majorId: 'human-resources',
        subject: '人力资源管理',
        prompt: '招聘活动前最应先明确的是：',
        options: ['岗位职责和任职资格', '员工旅游地点', '办公桌颜色', '公司口号字体'],
        answer: 0,
        explanation: '招聘配置应以工作分析形成的岗位职责和任职资格为基础。',
        tags: ['招聘配置'],
      },
      {
        id: 'lesson-econ-hr-001-q2',
        examId: ECONOMIST_EXAM_ID,
        majorId: 'human-resources',
        subject: '人力资源管理',
        prompt: '工作分析结果通常不直接包括：',
        options: ['岗位说明书', '任职资格', '绩效标准', '企业股价预测'],
        answer: 3,
        explanation: '企业股价预测不是工作分析的直接产出。',
        tags: ['工作分析'],
      },
    ],
  },
  {
    id: 'econ-hr-lesson-002',
    examId: ECONOMIST_EXAM_ID,
    majorId: 'human-resources',
    taskIds: ['economist-professional-core'],
    subject: '人力资源管理',
    title: '绩效管理与薪酬激励',
    minutes: 35,
    sourceNote: '原创学习笔记；围绕人力资源管理专业高频概念整理。',
    objectives: ['区分绩效考核和绩效管理', '理解薪酬激励公平性', '完成2道随堂题'],
    sections: [
      {
        heading: '绩效管理是闭环',
        body: '绩效管理不是只打分，而是目标设定、过程辅导、绩效评价、结果反馈和改进提升的循环过程。',
        bullets: ['目标要可衡量', '过程要沟通辅导', '结果要反馈和应用'],
      },
    ],
    examples: [{ prompt: '年终只给分不反馈', explanation: '这只是考核动作，不是完整绩效管理。' }],
    flashcards: [
      { front: '绩效管理闭环', back: '目标、辅导、评价、反馈、改进' },
      { front: '薪酬公平', back: '外部公平、内部公平、个人公平' },
    ],
    questions: [
      {
        id: 'lesson-econ-hr-002-q1',
        examId: ECONOMIST_EXAM_ID,
        majorId: 'human-resources',
        subject: '人力资源管理',
        prompt: '绩效管理区别于单纯绩效考核的关键是：',
        options: ['强调全过程沟通和改进', '只在年底打分', '只看出勤', '不需要目标'],
        answer: 0,
        explanation: '绩效管理是持续闭环，强调目标、辅导、评价、反馈和改进。',
        tags: ['绩效管理'],
      },
      {
        id: 'lesson-econ-hr-002-q2',
        examId: ECONOMIST_EXAM_ID,
        majorId: 'human-resources',
        subject: '人力资源管理',
        prompt: '薪酬设计中，同岗同酬主要体现：',
        options: ['内部公平', '随机性', '保密性', '无差别管理'],
        answer: 0,
        explanation: '同一组织内部岗位价值与薪酬对应，体现内部公平。',
        tags: ['薪酬管理'],
      },
    ],
  },
  {
    id: 'econ-professional-generic-001',
    examId: ECONOMIST_EXAM_ID,
    majorId: 'generic',
    taskIds: ['economist-professional-core'],
    subject: '专业知识和实务',
    title: '专业实务答题框架',
    minutes: 35,
    sourceNote: '原创通用学习笔记；用于非默认专业的起步计划，后续可继续扩充对应专业题库。',
    objectives: ['建立专业实务学习框架', '学会按主体和场景读题', '完成2道随堂题'],
    sections: [
      {
        heading: '专业实务三步法',
        body: '先识别行业主体，再找管理目标，最后匹配制度、流程、指标或风险控制工具。非人力资源方向也可以先用这个框架起步。',
        bullets: ['主体：企业、政府、个人或项目', '目标：效率、成本、风险、质量', '工具：制度、流程、指标、监督'],
      },
    ],
    examples: [{ prompt: '题干出现“提高组织效率”', explanation: '先判断主体和目标，再选择能改善流程或激励约束的选项。' }],
    flashcards: [{ front: '专业实务三步', back: '主体、目标、工具' }],
    questions: [
      {
        id: 'lesson-econ-generic-001-q1',
        examId: ECONOMIST_EXAM_ID,
        majorId: 'generic',
        subject: '专业知识和实务',
        prompt: '专业实务案例题读题时，最稳妥的第一步是：',
        options: ['识别题干主体和场景', '直接看最长选项', '只看年份', '先背答案序号'],
        answer: 0,
        explanation: '案例题先识别主体和场景，才能匹配正确工具。',
        tags: ['答题方法'],
      },
      {
        id: 'lesson-econ-generic-001-q2',
        examId: ECONOMIST_EXAM_ID,
        majorId: 'generic',
        subject: '专业知识和实务',
        prompt: '专业实务复习不建议：',
        options: ['跨专业混刷大量题', '按所选专业整理高频概念', '建立错题本', '做章节练习'],
        answer: 0,
        explanation: '专业实务按所选专业命题，跨专业混刷会稀释备考效率。',
        tags: ['复习策略'],
      },
    ],
  },
  {
    id: 'econ-review-lesson-001',
    examId: ECONOMIST_EXAM_ID,
    taskIds: ['economist-wrong-review'],
    subject: '经济师复习',
    title: '经济师错题回炉法',
    minutes: 20,
    sourceNote: '原创备考方法卡片。',
    objectives: ['归因错题', '标记章节', '安排二刷'],
    sections: [
      {
        heading: '错题三标签',
        body: '经济师错题建议标记“科目、章节、错因”。错因至少分为概念混淆、题干误读、计算/公式、记忆遗漏四类。',
        bullets: ['基础科目按六大模块归类', '专业科目按所选专业专题归类', '重复错题优先复习'],
      },
    ],
    examples: [{ prompt: '把财政政策误选为货币政策', explanation: '错因是主体和工具混淆，下次先看政府/央行主体。' }],
    flashcards: [{ front: '错题三标签', back: '科目、章节、错因' }],
    questions: [
      {
        id: 'lesson-econ-review-001-q1',
        examId: ECONOMIST_EXAM_ID,
        subject: '经济师复习',
        prompt: '经济师错题最应记录的是：',
        options: ['章节和错因', '只记录答案字母', '只记录分数', '完全不回看'],
        answer: 0,
        explanation: '章节和错因能帮助后续精准复习。',
        tags: ['错题'],
      },
    ],
  },
  {
    id: 'econ-exam-lesson-001',
    examId: ECONOMIST_EXAM_ID,
    taskIds: ['economist-weekly-exam', 'economist-monthly-exam'],
    subject: '经济师考试',
    title: '两科连续作答训练',
    minutes: 45,
    sourceNote: '原创机考训练策略卡片。',
    objectives: ['熟悉客观题节奏', '训练两科连续作答', '复盘正确率'],
    sections: [
      {
        heading: '限时优先',
        body: '经济师两科均为客观题，练习时不要边做边看答案。先限时完成，再集中核对，把薄弱点回流到基础或专业专题。',
        bullets: ['先经济基础，再专业实务', '不会题先标记，避免耗时过长', '复盘时统计章节正确率'],
      },
    ],
    examples: [{ prompt: '基础正确率高、专业低', explanation: '下周计划向专业实务倾斜，尤其补高频专题。' }],
    flashcards: [{ front: '模拟复盘', back: '限时、判分、归因、回炉' }],
    questions: [
      {
        id: 'lesson-econ-exam-001-q1',
        examId: ECONOMIST_EXAM_ID,
        subject: '经济师考试',
        prompt: '模拟考试最稳妥的流程是：',
        options: ['限时作答后集中复盘', '边看答案边做', '只看分数不改错', '只练一个科目'],
        answer: 0,
        explanation: '限时作答更接近真实机考，集中复盘才能找薄弱点。',
        tags: ['模拟'],
      },
    ],
  },
];

const majorQuestion = (majorId, subject, idPrefix, titleWord) => ({
  id: `econ-${idPrefix}-001`,
  examId: ECONOMIST_EXAM_ID,
  majorId,
  subject,
  prompt: `${subject}专业复习时，最应优先围绕什么建立章节框架？`,
  options: ['本专业考试大纲和高频概念', '其他专业真题', '随机短视频', '答案序号规律'],
  answer: 0,
  explanation: `${subject}属于《专业知识和实务》方向，复习要围绕本专业大纲、高频概念和典型案例。`,
  tags: [titleWord, '专业实务'],
});

export const ECONOMIST_QUESTION_BANK = [
  {
    id: 'econ-base-001',
    examId: ECONOMIST_EXAM_ID,
    subject: '经济基础知识',
    prompt: '初级、中级经济专业技术资格考试的公共科目是：',
    options: ['经济基础知识', '高级经济实务', '综合应用能力', '行政职业能力测验'],
    answer: 0,
    explanation: '《经济基础知识》是初级、中级经济专业技术资格考试的公共科目。',
    tags: ['科目结构'],
  },
  {
    id: 'econ-base-002',
    examId: ECONOMIST_EXAM_ID,
    subject: '经济基础知识',
    prompt: '财政政策的典型工具是：',
    options: ['政府支出', '法定存款准备金率', '再贴现率', '公开市场操作'],
    answer: 0,
    explanation: '政府支出属于财政政策工具，其余多为货币政策工具。',
    tags: ['财政'],
  },
  {
    id: 'econ-base-003',
    examId: ECONOMIST_EXAM_ID,
    subject: '经济基础知识',
    prompt: '一般情况下，价格上升导致需求量：',
    options: ['减少', '增加', '不变', '变为零'],
    answer: 0,
    explanation: '需求规律表明，其他条件不变时价格上升通常导致需求量减少。',
    tags: ['微观经济'],
  },
  {
    id: 'econ-hr-001',
    examId: ECONOMIST_EXAM_ID,
    majorId: 'human-resources',
    subject: '人力资源管理',
    prompt: '工作分析的主要产出通常包括：',
    options: ['岗位说明书和任职资格', '年度利润表', '市场份额预测', '现金流量表'],
    answer: 0,
    explanation: '工作分析通常形成岗位说明书和任职资格，为招聘、培训、绩效和薪酬提供基础。',
    tags: ['工作分析'],
  },
  {
    id: 'econ-hr-002',
    examId: ECONOMIST_EXAM_ID,
    majorId: 'human-resources',
    subject: '人力资源管理',
    prompt: '绩效管理的完整流程更强调：',
    options: ['目标、辅导、评价、反馈和改进', '只在年底打分', '只统计迟到', '只发奖金'],
    answer: 0,
    explanation: '绩效管理是持续闭环，不等同于单次绩效考核。',
    tags: ['绩效管理'],
  },
  majorQuestion('business', '工商管理', 'business', '工商管理'),
  majorQuestion('finance', '金融', 'finance', '金融'),
  majorQuestion('fiscal-tax', '财政税收', 'fiscal-tax', '财政税收'),
  majorQuestion('intellectual-property', '知识产权', 'ip', '知识产权'),
  majorQuestion('agriculture', '农业经济', 'agriculture', '农业经济'),
  majorQuestion('insurance', '保险', 'insurance', '保险'),
  majorQuestion('transport', '运输经济', 'transport', '运输经济'),
  majorQuestion('tourism', '旅游经济', 'tourism', '旅游经济'),
  majorQuestion('construction-real-estate', '建筑与房地产经济', 'construction', '建筑与房地产经济'),
];

export function getExamCategory(examId) {
  return EXAM_CATEGORIES.find((exam) => exam.id === examId) || EXAM_CATEGORIES[0];
}

export function getEconomistMajor(majorId) {
  return ECONOMIST_MAJOR_OPTIONS.find((major) => major.id === majorId) || null;
}
