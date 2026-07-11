# 溜哥的安全管理平台 — 项目开发规范（PROJECT_SPEC）

> 本文档是项目开发的唯一权威规范。任何开发行为必须严格遵循本文档。
> 最后更新：2026-07-11 v5.0.0（Glue Coding重构：MiniSearch替换BM25、LangChain替换自研Chunker、OpenAI SDK升级AI调用、结巴分词替换双字滑窗）
>
> **配套文件：** 每次编码会话开始时，AI 必须同时加载 `VIBE_CODING_PROMPT.md`（基于 vibe-coding-cn 的拼好码工作流提示词）。两个文件配合使用：本文件定义「要做什么」，VIBE_CODING_PROMPT.md 定义「怎么做」。

---

## 〇、Trae Solo 技能使用规范（最重要！必读）

本项目开发**必须充分利用Trae Solo内置技能**提高效率、降低错误。

### 0.1 必须调用的技能

| 场景 | 必须调用的技能 | 说明 |
|------|---------------|------|
| 创建/修改UI页面、组件、弹窗 | `frontend-design` | 生成高质量React+Tailwind+shadcn/ui界面 |
| 从零创建新页面/模块 | `web-dev` | 生产级Web开发规范 |
| 构建复杂多组件页面/交互 | `web-artifacts-builder` | React+Tailwind+shadcn复杂UI |
| 验证功能、跑通流程 | `webapp-testing` | 用Playwright自动测试，截图验证 |

### 0.2 技能调用时机

**每个Phase完成验收时**，必须调用`webapp-testing`技能：
- 启动开发服务器
- 自动浏览器导航、点击、输入
- 截图验证页面无错乱
- 确认功能能走通
- 发现问题立即修复，再测试

**创建/重构页面时**，必须调用`frontend-design`技能：
- 先告诉它页面需求（"全桌面安全管理系统的工作台页面，深色侧边栏240px，工业安全专业风，teal主色..."）
- 按它生成的代码为基础，再融入业务逻辑
- 不要自己硬写UI组件，优先用它生成的生产级代码

### 0.3 禁止事项

- 不要用原生JS手写DOM操作（违反React声明式范式）
- 不要手写基础UI组件（Button/Input/Modal/Table等用shadcn/ui）
- 不要自己写路由/状态管理（用react-router-dom/Zustand）
- 不要在组件里直接操作IndexedDB（通过service层，用dexie-react-hooks的useLiveQuery）

---

## 〇.1 功能渐进发布机制（Feature Flag）

为支持MVP快速上线、迭代开发，所有功能通过**功能开关**控制显示。

### 核心原则
- 未完成/未测试的页面和功能，**保留代码但隐藏UI入口**。
- 侧边栏菜单根据功能开关动态渲染，用户看不到不应该看到的功能。
- 功能开关集中配置，一处修改控制全局。
- 开发到哪个阶段，就把对应功能的开关打开。

### 功能开关配置

在 `src/config/features.ts` 中集中管理：

```typescript
export interface FeatureFlags {
  home: boolean                  // 工作台
  projectManagement: boolean     // 项目管理
  subcontractorManagement: boolean // 分包管理
  workerManagement: boolean      // 人员管理
  educationManagement: boolean   // 安全教育培训
  trainingManagement: boolean    // 培训管理
  dailyLog: boolean              // 安全日志
  hazardManagement: boolean      // 隐患排查治理
  hazardSource: boolean          // 危险源辨识
  dangerousProject: boolean      // 危大工程
  workPermit: boolean            // 危险作业许可
  acceptance: boolean            // 安全验收
  meeting: boolean               // 安全会议
  correspondence: boolean        // 收发文
  dashboard: boolean             // 统计看板
  reportCenter: boolean          // 报表中心
  templateLibrary: boolean       // 模板库
  documentGeneration: boolean    // 文档生成
  aiAssistant: boolean           // AI助手（导入+RAG写作）
  knowledgeBase: boolean         // 本地知识库管理
  settings: boolean              // 设置（AI配置+备份恢复）
  variableSettings: boolean      // 全局变量设置
}

// 当前所有已开发模块均已测试通过，全部开启
export const featureFlags: FeatureFlags = {
  home: true,
  projectManagement: true,
  subcontractorManagement: true,
  workerManagement: true,
  educationManagement: true,
  trainingManagement: true,
  dailyLog: true,
  hazardManagement: true,
  hazardSource: true,
  dangerousProject: true,
  workPermit: true,
  acceptance: true,
  meeting: true,
  correspondence: true,
  dashboard: true,
  reportCenter: true,
  templateLibrary: true,
  documentGeneration: true,
  aiAssistant: true,
  knowledgeBase: true,
  settings: true,
  variableSettings: true,
}
```

**已全部启用**（v4.0 所有 27 个模块均已开发，无远期规划模块）

### 侧边栏菜单按开关渲染

在 `Sidebar.tsx` 中，菜单项配置包含 `feature` 字段，只有对应开关为 `true` 才渲染：

```typescript
const menuItems = [
  { label: '项目管理', icon: Building2, path: '/projects', feature: 'projectManagement' },
  { label: '模板库', icon: FolderOpen, path: '/templates', feature: 'templateLibrary' },
  { label: '知识库', icon: BookOpen, path: '/knowledge', feature: 'knowledgeBase' },
  { label: '隐患排查', icon: AlertTriangle, path: '/hazards', feature: 'hazardManagement' },
  { label: '人员管理', icon: Users, path: '/workers', feature: 'workerManagement' },
  // ...
]
```

---

## 〇.2 全局状态与异步任务 UX 规范

为避免切换标签页后进度丢失、异步操作无反馈、异常中断后状态混乱等细节问题，以下规则为**强制性开发约束**。

### 状态分层规则（必须遵守）

| 状态类型 | 存放位置 | 示例 |
|---------|---------|------|
| 纯组件 UI 状态 | `useState` | 当前输入框内容、弹窗开合、hover 高亮 |
| 跨页面需保持的异步进度 | Zustand `useAppStore` | 模板库扫描进度、批量生成进度、文件上传进度、长时间 AI 调用状态 |
| 用户持久化数据 | IndexedDB（Dexie） | 项目、模板、知识库文档、生成的台账记录 |

**原则：** 任何可能持续数秒以上、用户可能在等待期间切换页面的操作，其进度状态必须进入 Zustand，不得仅存于组件 `useState`。

### 异步任务 UX 三要素

所有预计耗时超过 2 秒的异步操作，必须同时满足：

1. **显示进度**  
   进度条或百分比文字，且更新频率足够细（建议按单个文件/单个记录粒度更新，而非大批量一次性更新）。
2. **支持取消**  
   提供显眼的「取消」入口；取消后清理状态、释放资源、给用户明确反馈。
3. **失败隔离**  
   批量处理中单个项失败不得阻断整体流程；失败项需在结果中列出原因，其余项继续执行。

### 导航不丢状态规则

顶部标签栏属于 SPA 内导航（React Router `HashRouter`）。以下场景切换标签页后，原页面状态必须保留或给出明确交代：

- 正在扫描/导入/生成时切走 → 进度条在切回后仍显示，且操作在后台继续运行。
- 有未保存表单时切走 → 数据自动暂存或提示用户。
- 弹窗/抽屉中正在进行的操作 → 操作完成后通过全局 toast 通知，即使用户不在当前页。

### 常见异步操作 checklist

开发完成后必须逐项自检：

- [ ] 操作开始时，对应按钮/入口立即进入禁用态，防止重复触发。
- [ ] 进度更新是否按最小粒度刷新，而不是只有开始和结束两个状态。
- [ ] 切换标签页再回来，进度和结果是否还在。
- [ ] 取消操作后，状态是否被正确清理，按钮是否恢复可点。
- [ ] 单个文件/记录失败时，整体流程是否继续，错误是否被记录并展示。
- [ ] 操作完成后，是否有 toast 或结果面板反馈。

---

## 〇.3 Glue Coding（拼好码）工程规范

> 核心理念：**成熟能力解决通用问题，胶水代码连接业务流程，自研只服务真正不可替代的差异。**
> 参考文档：[拼好码（Glue Coding）](https://github.com/tradecatlabs/vibe-coding-cn/blob/develop/docs/concepts/glue-coding.md)

### 决策顺序

| 优先级 | 策略 | 本项目示例 |
|--------|------|-----------|
| 1 | 优先寻找官方能力、平台能力、已有成熟方案 | docxtemplater（Word生成）、ExcelJS（Excel生成）、Dexie.js（数据库） |
| 2 | 优先采用成熟开源库、稳定框架 | MiniSearch（全文检索）、OpenAI SDK（AI调用）、LangChain TextSplitter（文本切分） |
| 3 | 优先通过配置、插件、适配层满足需求 | MiniSearch的tokenize回调注入结巴分词、OpenAI SDK的baseURL指向DeepSeek |
| 4 | 仅在业务差异、集成边界需要时编写自研代码 | 隐患状态机、安全台账映射逻辑、RAG管线编排 |
| 5 | 仅当成熟方案无法满足关键约束时，才允许自研核心能力 | 须填写偏离说明（原因、已评估方案、维护成本、回滚路径） |

### 胶水代码应该做什么

- 连接不同系统（MiniSearch ↔ Dexie ↔ OpenAI SDK）
- 封装业务流程（RAG管线：检索→Prompt拼接→流式输出→引用标注）
- 适配输入输出（OpenAI SDK baseURL → DeepSeek，结巴分词 → MiniSearch tokenize）
- 隔离第三方依赖（每个外部库通过适配层封装，内部调用成熟库，对外暴露统一接口）
- 表达项目特有业务规则（隐患状态机、台账映射配置）

### 胶水代码不应该做什么

- ❌ 重复实现已有成熟框架（如自研BM25引擎）
- ❌ 重复实现通用基础设施（如自研文本切分器）
- ❌ 无理由重写稳定库
- ❌ 在未调研成熟方案前直接进入自研实现
- ❌ 让第三方SDK/API的私有模型污染核心业务模型

### 可替换设计原则

每个关键模块保留 fallback 方案，通过配置开关切换：

| 模块 | 主方案 | 降级方案 | 切换条件 |
|------|--------|---------|---------|
| 全文检索 | MiniSearch | FlexSearch（CJK原生支持） | 知识库文档量 > 5000 篇 |
| 中文分词 | @node-rs/jieba | jieba-wasm | Electron打包NAPI不兼容 |
| AI调用 | OpenAI Node SDK | 原生fetch（当前方案） | SDK版本不兼容 |
| 文本切分 | LangChain TextSplitter | 自研chunker（当前方案） | 包体积敏感场景 |

### 偏离协议

如需偏离胶水原则自研核心能力，必须记录：
- 偏离原因、已评估的成熟方案、为什么成熟方案不能满足
- 自研范围和边界、维护成本、安全风险
- 测试策略、替换/删除/回滚路径

---

## 一、产品定位

溜哥的安全管理平台是以**独立 Electron 桌面应用**形态存在的**建筑施工安全管理全生命周期工作平台**，服务于施工单位安全总监/安全员，覆盖"数据采集→台账沉淀→文档编辑→文档生成→统计分析→AI增强"完整链路。

**品牌**：溜哥的安全管理平台（liuge-safety-platform），简称"安全平台"。
**形态**：单 exe 安装包，双击运行，不依赖 WPS / Office / 任何第三方办公软件。
**路线**：Phase 1 单机版（数据存本地 IndexedDB）→ Phase 2 联网版（公司级部署，多项目管理）。

核心使用场景：
1. 新项目进场，一键批量生成全套安全资料（按归档目录结构，几百份Word/Excel）
2. **软件内直接编辑 Word/Excel 文档**（docx-editor + Univer Sheets，不必开 WPS）
3. 日常安全管理：录入隐患、写安全日志、登记工人、记录培训教育
4. 周报月报：从日常数据自动聚合统计生成
5. AI辅助：基于安全规范知识库，辅助写方案、续写到光标位置、检查合规性
6. 领导看板：隐患统计、整改率、教育覆盖率等数据可视化
7. 远期总部数据汇总：单机使用→本地Node服务+移动端→云端数据同步

---

## 二、技术栈（React生态，最大化Trae AI效能）

| 维度 | 选型 | 版本 | 说明 |
|------|------|------|------|
| 桌面壳 | Electron | 28+ | 单 exe 打包，原生窗口，文件系统访问 |
| 构建工具 | Vite | 5+ | npm create vite@latest react-ts模板 |
| 前端框架 | React | 18+ | 函数组件+Hooks |
| 语言 | TypeScript | 5+ | 严格模式，减少类型错误 |
| 样式 | Tailwind CSS | 3+ | 原子化CSS，AI生成效率最高 |
| UI组件库 | shadcn/ui | latest | 高质量React组件（Button/Dialog/Table/Form等） |
| 图标 | lucide-react | latest | shadcn/ui默认图标库 |
| 路由 | react-router-dom | 6+ | HashRouter（Electron本地文件必须hash路由） |
| 状态管理 | Zustand | 4+ | 轻量全局状态（<2KB），替代Redux |
| 表单 | react-hook-form | 7+ | 高性能表单，结合zod校验 |
| 表单校验 | zod | 3+ | TypeScript-first schema校验 |
| 数据库 | IndexedDB via Dexie.js | 4+ | dexie-react-hooks提供useLiveQuery响应式查询 |
| Word编辑 | @eigenpal/docx-editor-react | latest | Apache 2.0，WYSIWYG .docx 编辑器，43/55 Full |
| Excel编辑 | @univerjs/sheets + @univerjs/ui | latest | Apache 2.0，在线 Excel 编辑 |
| Word生成 | docxtemplater + pizzip | latest | 复杂排版文档变量替换+标准台账表格循环 |
| Excel生成 | ExcelJS | latest | 标准台账渲染：样式、合并单元格、数据校验、页脚水印 |
| Excel读取 | SheetJS (xlsx) | latest | 读取用户上传的xlsx模板/识别表头 |
| PDF预览 | pdfjs-dist | latest | 知识库PDF预览 |
| 图表 | chart.js + react-chartjs-2 | 4+ | 饼图/柱状图/折线图/环形图 |
| Word解析 | mammoth | latest | 知识库解析docx为纯文本 |
| 日期处理 | date-fns | latest | 轻量日期工具（不用moment） |
| 类名工具 | clsx + tailwind-merge | latest | shadcn/ui推荐的条件类名方案 |
| AI接口 | openai (OpenAI Node SDK) | 4+ | 📦 待安装 | 兼容DeepSeek（baseURL配置）/通义千问/GPT，流式输出+自动重试 |
| 中文分词 | @node-rs/jieba（结巴分词） | latest | 📦 待安装 | Rust实现，性能10-20倍于纯JS；备选方案jieba-wasm |
| 全文检索 | MiniSearch | 7+ | 📦 待安装 | 49.8k+项目依赖，原生BM25+前缀搜索+模糊匹配+自动建议 |
| 文本切分 | @langchain/textsplitters | latest | 📦 待安装 | RecursiveCharacterTextSplitter，支持自定义分隔符 |
| 打包工具 | electron-builder | latest | 打包为单 exe 安装程序 |
| 运行环境 | Electron Chromium | - | 目标Chrome 120+ |
| 浏览器调试 | 同一套代码，Vite dev server | - | Chrome直接打开localhost调试 |
| 测试 | Playwright（通过webapp-testing技能） | - | Phase验收时自动测试 |

### 为什么选 Electron + React + Tailwind + shadcn？

1. **独立 exe，不依赖任何第三方软件**——这是最大的收益，终结 WPS 版本兼容噩梦
2. **AI能直接使用frontend-design技能生成高质量UI代码**——效率提升3-5倍
3. **shadcn/ui组件已经过生产验证**——不用自己造Button/Modal/Table，bug率大幅下降
4. **Tailwind原子化CSS**——AI写样式最准，不会出现class冲突，不用写自定义CSS
5. **TypeScript类型安全**——编译阶段发现错误，AI生成代码更准确
6. **React Hooks声明式编程**——状态驱动UI重渲染，比手动DOM操作少80%bug
7. **react-hook-form+zod**——表单校验、错误提示、动态字段都是现成的
8. **Zustand全局状态**——极简API，比自造store可靠
9. **Electron完全兼容**——Chromium内核，和浏览器开发体验一致
10. **docx-editor + Univer Sheets**——纯前端 React 组件，同一窗口内编辑 Word/Excel
11. **Glue Coding（拼好码）工程哲学**——优先复用成熟开源方案，自研只服务业务差异。v5.0用MiniSearch替代自研BM25、OpenAI SDK替代原始fetch、结巴分词替代双字滑窗、LangChain TextSplitter替代自研chunker，删除约450行自研代码，同时获得模糊搜索、自动建议等新能力

---

## 三、目录结构（严格遵守）

```
liuge-safety-platform/
├── PROJECT_SPEC.md                    ← 本文档（项目规范，必读）
├── index.html                         ← Vite入口HTML
├── vite.config.ts                     ← Vite配置（base:'./', port:8080）
├── tailwind.config.js                 ← Tailwind配置（主题色teal）
├── postcss.config.js                  ← PostCSS配置
├── tsconfig.json                      ← TypeScript配置（严格模式）
├── components.json                    ← shadcn/ui配置
├── package.json
├── electron/                          ← 【Electron主进程】（新增）
│   ├── main.ts                        ← 主入口：窗口管理、菜单、IPC
│   ├── preload.ts                     ← contextBridge 安全暴露API
│   └── menu.ts                        ← 应用菜单模板
├── scripts/                           ← 构建和脚本工具
│   └── gen-ledger-templates.cjs       ← 台账模板生成脚本
├── public/
│   └── assets/                        ← 静态图片、图标、favicon
└── src/
    ├── main.tsx                       ← 应用入口（ReactDOM.createRoot挂载）
    ├── App.tsx                        ← 根组件（Router+Layout+全局Provider）
    ├── index.css                      ← Tailwind入口（@tailwind base/components/utilities + CSS变量）
    │
    ├── core/                          ← 【框架核心】与业务无关的基础设施
    │   ├── errors.ts                  ← 自定义错误类（ServiceError/ValidationError）
    │   ├── event-bus.ts               ← 事件总线（mitt库，模块间解耦通信）
    │   └── constants.ts               ← 全局常量（APP_NAME、PRIMARY_COLOR、downloadBlob）
    │
    ├── db/                            ← 【数据层】唯一数据访问入口
    │   ├── index.ts                   ← Dexie初始化+版本管理+迁移（DB名：liuge_safety）
    │   ├── schema.ts                  ← 所有表结构的TypeScript类型定义
    │   ├── migrations/                ← 数据库升级脚本
    │   │   └── v1_initial.ts
    │   └── repositories/              ← 每个表一个Repo，继承BaseRepository
    │       ├── base.repo.ts           ← Repository基类（泛型，统一CRUD/分页/事件触发）
    │       ├── project.repo.ts
    │       ├── project-personnel.repo.ts
    │       ├── ...（40+ 个 repo，不变）
    │       └── sync-queue.repo.ts
    │
    ├── services/                      ← 【业务逻辑层】纯TypeScript，无React依赖
    │   ├── project.service.ts
    │   ├── ...（所有 service 不变）
    │   └── ocr.service.ts
    │
    ├── components/                    ← 【React组件】
    │   ├── ui/                        ← shadcn/ui组件（通过npx shadcn@latest add安装）
    │   │   ├── button.tsx
    │   │   ├── ...（所有 shadcn 组件不变）
    │   │   └── sonner.tsx
    │   │
    │   ├── layout/                    ← 布局组件（v4.0 重构）
    │   │   ├── AppLayout.tsx           ← 整体布局（240px深色侧边栏+56px Header+内容区）
    │   │   ├── Sidebar.tsx             ← 240px深色侧边栏（27 模块，7 组）
    │   │   ├── SidebarItem.tsx         ← 单个导航项
    │   │   ├── Header.tsx              ← 顶部56px栏（面包屑+项目切换+铃铛+搜索）
    │   │   ├── PageContainer.tsx       ← 页面容器（滚动+内边距）
    │   │   └── NotificationBell.tsx    ← 通知铃铛+红点
    │   │
    │   ├── business/                  ← 【业务复用组件】（非shadcn通用组件）
    │   │   ├── DynamicForm.tsx
    │   │   ├── ...（所有业务组件不变）
    │   │   └── ErrorBoundary.tsx
    │   │
    │   ├── editors/                   ← 【文档编辑器封装】（新增）
    │   │   ├── DocxEditor.tsx          ← docx-editor 封装（打开/编辑/保存 .docx）
    │   │   └── XlsxEditor.tsx          ← Univer Sheets 封装（打开/编辑/保存 .xlsx）
    │   │
    │   └── charts/                    ← 图表组件
    │       ├── PieChart.tsx
    │       ├── BarChart.tsx
    │       ├── LineChart.tsx
    │       └── DonutChart.tsx
    │
    ├── pages/                        ← 【页面组件】每个页面一个文件夹
    │   ├── home/
    │   │   └── HomePage.tsx            ← 工作台（待办+概览+快捷入口）
    │   ├── editor/                    ← 编辑器页面（新增）
    │   │   ├── DocxEditorPage.tsx      ← Word 在线编辑页面
    │   │   └── XlsxEditorPage.tsx      ← Excel 在线编辑页面
    │   ├── projects/
    │   ├── ...（所有页面不变）
    │   └── mobile/
    │
    ├── store/                        ← 【Zustand全局状态】
    │   ├── useAppStore.ts
    │   ├── useProjectStore.ts
    │   └── useNotificationStore.ts
    │
    ├── hooks/                        ← 【自定义React Hooks】
    │   ├── useCurrentProject.ts
    │   ├── useRepository.ts
    │   ├── ...（所有 hooks 不变）
    │   └── useElectron.ts             ← Electron IPC 封装 hook（新增）
    │
    ├── config/                       ← 【配置与字典】
    │   ├── menu.tsx                   ← 侧栏菜单配置（27 模块，7 组）
    │   ├── features.ts               ← 功能开关（新增 docxEditor/xlsxEditor）
    │   ├── forms/                    ← 各业务表单的zod schema + uiSchema
    │   ├── ...（所有配置不变）
    │   └── category-seed.ts
    │
    ├── utils/                        ← 【纯工具函数】
    │   ├── date.ts
    │   ├── ...（所有工具不变）
    │   └── cn.ts
    │
    ├── types/                        ← 【TypeScript类型定义】
    │   ├── db.ts
    │   ├── common.ts
    │   ├── form.ts
    │   └── electron.ts               ← Electron API 类型声明（新增）
    │
    └── kb-seed/                      ← 【预置知识库种子】
        ├── templates/
        ├── regulations/
        └── checklists/
```

---

## 四、分层架构铁律（违反即重构）

```
┌──────────────────────────────────────────────┐
│  UI层 (pages/, components/)                   │
│  React组件，只负责渲染和交互                    │
│  可以调用：hooks, services, utils, store       │
│  严禁：直接import db/repositories              │
│  严禁：直接操作DOM（用React state+ref）         │
└──────────────┬───────────────────────────────┘
               │ hooks/useService()
┌──────────────▼───────────────────────────────┐
│  Service层 (services/)                        │
│  业务逻辑、流程编排、数据校验，纯TS无React依赖   │
│  可以调用：repositories, utils, event-bus      │
│  返回Promise，抛ServiceError                   │
│  严禁：操作DOM、使用React hooks、访问localStorage│
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│  Repository层 (db/repositories/)              │
│  数据CRUD，继承BaseRepository<T>               │
│  可以调用：Dexie API                           │
│  自动记录createdAt/updatedAt，自动触发事件      │
│  不写业务逻辑                                  │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│  IndexedDB (Dexie.js)                         │
│  持久化存储，响应式查询通过useLiveQuery         │
└──────────────────────────────────────────────┘
```

### 状态管理规范

| 数据类型 | 存储位置 | 说明 |
|---------|---------|------|
| currentProject（当前项目） | Zustand useProjectStore | 全局，切换项目所有页面刷新 |
| userInfo/AI配置 | Zustand useProjectStore | 全局 |
| UI状态（侧栏折叠、弹窗开关） | 组件useState 或 useAppStore | 局部优先 |
| 列表数据 | useLiveQuery(Repo查询) | 响应式，数据变更自动重渲染 |
| 表单草稿 | useAutoSave hook + localStorage | 30秒自动保存 |
| 服务端/异步状态 | React Query（可选）或useState+useEffect | 前期用useState即可 |

**全局状态最小化原则**：只有真正跨页面共享的才放Zustand，页面内状态一律useState。

### 组件通信规范

- 父子组件：props传递，子组件通过回调通知父组件
- 跨层级/兄弟组件：Zustand store 或 event-bus事件
- 数据更新：调用service方法 → Repo写DB → useLiveQuery自动感知变化 → UI重渲染
- 严禁：组件直接import其他组件的state

---

## 五、UI设计规范（v4.0 独立桌面应用）

> 设计原则：这是**独立桌面安全管理工具**，不是营销网站也不是 WPS 插件。风格参考 Linear / Notion 桌面端：深色侧边栏、浅色内容区、信息密度适中、操作路径最短。
>
> 视觉主题：**工业安全专业风** — 高对比度（户外强光下可读）、大触控目标、色彩克制（teal 主色 + 灰阶 + 红黄绿状态色）、暗色侧边栏营造专注感。

### 5.1 整体界面三层结构

```
┌──────┬──────────────────────────────────────────────────────────┐
│      │  Header (56px)                                          │
│      │  [面包屑] [项目名称]              [通知铃铛] [头像] [版本] │
│      ├──────────────────────────────────────────────────────────┤
│      │                                                          │
│Sidebar│               Content Area（scrollable）                │
│240px │                                                          │
│深色  │                                                          │
│      │                                                          │
│ 导航  │                                                          │
│ 菜单  │                                                          │
│      │                                                          │
│ 27个  │                                                          │
│ 模块  │                                                          │
│ 分组  │                                                          │
│      │                                                          │
│      │                                                          │
│ ──── │                                                          │
│ 设置  │                                                          │
└──────┴──────────────────────────────────────────────────────────┘
          最小窗口: 1280 x 800
          推荐窗口: 1440 x 900
```

### 5.2 尺寸规范（全桌面窗口）

| 元素 | 尺寸 | 说明 |
|------|------|------|
| 窗口最小尺寸 | 1280×800 | 兼容大部分笔记本 |
| 窗口推荐尺寸 | 1440×900 | 最佳体验 |
| 侧边栏宽度 | 240px（展开）/ 64px（折叠） | 深色背景（slate-900） |
| Header高度 | 56px | 白色背景，底部 1px 边框 |
| 内容区内边距 | p-6（24px） | 页面级容器 |
| 卡片内边距 | p-5（20px） | 卡片组件 |
| 卡片间距 | gap-4（16px） | 卡片网格 |
| 表单项间距 | gap-4（16px） | 表单组件 |
| 按钮高度 | h-9（36px）小 / h-10（40px）主 | 触控友好 |
| 输入框高度 | h-10（40px） | 统一高度 |
| 字号基准 | text-xs（12px）辅助 / text-sm（14px）正文 | 桌面端可读 |
| 圆角 | rounded-lg（8px）卡片 / rounded-md（6px）输入框 | 统一圆角 |

### 5.3 侧边栏设计（Sidebar v4.0）

**从 60px 图标栏 → 240px 深色侧边栏。**

- 背景：slate-900（#0F172A），文字：slate-300/white
- 顶部 Logo 区域（56px）：盾牌图标 + App 名称 + 副标题
- 菜单按安全管理工作流分 **7 组**，清晰反映工地实际业务流程：

| 序号 | 分组 | 模块 | 设计逻辑 |
|------|------|------|---------|
| 1 | 基础管理 | 工作台、项目管理、分包管理、人员管理、机械设备 | 进场准备阶段：建项目→审分包→管人员→验设备 |
| 2 | 安全过程 | 安全教育、安全培训、安全日志、隐患排查、危险源辨识、危大工程、作业许可、安全验收 | 日常管控全流程：班前教育→过程检查→许可审批→完工验收 |
| 3 | 台账报表 | 模板库、台账生成、报表中心、数据看板 | **过程管控的成果输出**（中建/中铁审计逻辑："没有台账就等于没有做"） |
| 4 | 安全物资 | 劳保用品、应急管理、安全费用 | 物资保障：劳保采购发放→应急预案演练→安全费用台账 |
| 5 | 事故与沟通 | 事故管理、安全会议、收发文 | 应急处置与沟通：事故上报→会议纪要→文件往来 |
| 6 | 智能工具 | AI助手、知识库、文档编辑器 | 辅助功能：AI写作→规范查询→文档编辑 |
| 7 | 系统 | 设置 | 全局配置 |

**关键设计决策：**
- 人员管理独立于分包管理（自有人员 ≠ 分包人员，管理维度不同）
- 台账报表紧跟安全过程（第 3 组），不是"辅助报表"而是核心输出
- 所有模块均为正式功能，无"新"标签（已全部开发完成）

- 当前激活项：bg-teal-600/15 背景 + teal-400 文字 + 图标加粗
- 功能开关关闭的模块不显示对应菜单项
- 底部 Footer：项目名称 + 版本号

### 5.4 Header 设计（v4.0）

- 高度：56px
- 背景：白色（bg-white），底部 1px 边框（border-border）
- 左侧：面包屑导航（当前模块名 / 子页面名）
- 中间：当前项目名称（可点击切换）
- 右侧：搜索图标、通知铃铛（红点）、头像/用户名、版本号（v2.0.0）
- 窗口控制按钮（最小化/最大化/关闭）由 Electron 原生提供

### 5.5 内容区设计

- 背景：slate-50（#F8FAFC）
- 页面级容器：max-w-7xl + mx-auto + px-6 py-4
- 三种页面模式：

**列表页**（17 个模块共用）：
```
┌─────────────────────────────────────────────┐
│ [页面标题]                    [+ 新增按钮]   │
├─────────────────────────────────────────────┤
│ [搜索框] [状态筛选] [日期筛选]  [导出]       │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ DataTable（排序、分页、行选择）          │ │
│ │ □ 序号 │ 名称 │ 状态 │ 日期 │ 操作      │ │
│ └─────────────────────────────────────────┘ │
│                    [上一页] 1/10 [下一页]     │
└─────────────────────────────────────────────┘
```

**表单页**（新建/编辑）：
```
┌─────────────────────────────────────────────┐
│ [← 返回]  新建 / 编辑 xxx                   │
├─────────────────────────────────────────────┤
│ ┌─ 基本信息 ──────────────────────────────┐ │
│ │ 字段1：[________]  字段2：[________]     │ │
│ └─────────────────────────────────────────┘ │
│ ┌─ 详细信息 ──────────────────────────────┐ │
│ │ 字段3：[________________]               │ │
│ └─────────────────────────────────────────┘ │
│              [取消]  [保存]                  │
└─────────────────────────────────────────────┘
```

**仪表盘页**（工作台、数据看板）：
- KPI 卡片行（4 列网格）：隐患总数、整改率、教育覆盖率、证书到期数
- 图表行（2 列网格）：饼图 + 柱状图
- 快捷操作区：常用功能入口

### 5.6 颜色系统（v4.0 — 工业安全专业风）

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#0F766E',  // teal-700，主操作色
        50: '#F0FDFA',
        100: '#CCFBF1',
        500: '#14B8A6',
        600: '#0D9488',
        700: '#0F766E',
      },
      surface: {
        DEFAULT: '#FFFFFF',
        secondary: '#F8FAFC',  // slate-50
        tertiary: '#F1F5F9',   // slate-100
      },
      sidebar: '#0F172A',       // slate-900，侧边栏
      text: {
        DEFAULT: '#1E293B',     // slate-800
        secondary: '#64748B',   // slate-500
        tertiary: '#94A3B8',    // slate-400
      },
      border: '#E2E8F0',        // slate-200
      success: { DEFAULT: '#059669', light: '#ECFDF5' },
      warning: { DEFAULT: '#F59E0B', light: '#FFFBEB' },
      danger:  { DEFAULT: '#DC2626', light: '#FEF2F2' },
    },
  }
}
```

在shadcn/ui组件中通过CSS变量绑定（index.css）：
```css
@layer base {
  :root {
    --background: 210 40% 98%;     /* #F8FAFC */
    --foreground: 217 33% 17%;     /* #1E293B */
    --primary: 175 75% 26%;        /* #0F766E */
    --primary-foreground: 0 0% 100%;
    --muted: 214 32% 91%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --radius: 0.5rem;
  }
}
```

**颜色使用原则**：
- 主色 teal 只用于：主要按钮、选中状态、激活指示器、链接
- 侧边栏 slate-900 深色，营造专注感
- 灰色用于：背景、边框、次要文字、禁用状态
- 红色只用于：删除、错误、逾期、严重隐患
- 黄色只用于：警告、待处理、即将到期
- 绿色只用于：成功、已闭环、已完成
- 禁止装饰性渐变背景
- **同一页面内，primary 按钮最多 1 个，避免视觉竞争**

### 5.7 排版与布局原则

- **卡片降级**：能用列表不用卡片，能用分区不用卡片。卡片只在需要承载多个操作时使用。
- **列表视图优先**：工作台最近生成、知识库文档、项目列表都用行列表。
- **分组用细线**：不同信息组用 `border-b border-border` 分隔，不要用卡片框。
- **一行一个主操作**：每个列表项右侧只放一个最常用操作，次要操作收到下拉菜单。
- **信息密度适中但可读**：桌面端不拥挤，行高舒适，字号 14px 正文。
- **全屏Sheet表单**：长表单右侧滑出全屏 Sheet，不挤在内容区。

### 5.8 关键交互原则

- 所有长操作（>0.5秒）必须显示进度条/loading状态
- 进度条要分阶段显示（扫描文件中→解析变量中→导入中），不让用户以为卡死
- 危险操作（删除/退场/归档）必须用AlertDialog二次确认
- 批量操作栏：选中项目后出现，显示已选数量和批量操作按钮
- 搜索框默认显示在操作栏下方第二行，不挤压按钮
- 表格行 hover 高亮，点击行进入详情

### 5.9 工作台首页设计（HomePage v4.0）

工作台是打开软件后的默认首页，回答"我接下来做什么"。

```
┌──────────────────────────────────────────────────────────────┐
│ 工作台                                                       │
│                                                              │
│ 当前项目：大理机场土石方项目二标段              [切换项目 ▼]  │
│                                                              │
│ ┌─ 快速开始 ───────────────────────────────────────────────┐ │
│ │ [生成今日安全日志] [批量生成全套资料] [AI写专项方案]      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ 安全概览 ───────────────────────────────────────────────┐ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│ │ │ 隐患总数  │ │ 整改率   │ │ 教育覆盖率│ │ 证书到期  │     │ │
│ │ │   23     │ │  87%     │ │   92%    │ │   3      │     │ │
│ │ │ ↑ 5 本周 │ │ ↑ 2%     │ │ ↓ 3%     │ │ ⚠ 7天内  │     │ │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ 最近生成 ───────────────────────────────────────────────┐ │
│ │ 📄 安全检查表_2026-07-08.docx              2分钟前  [打开] │ │
│ │ 📄 隐患整改单_2026-07-08.docx             10分钟前  [打开] │ │
│ │ 📊 三级教育花名册_2026-07-08.xlsx         1小时前   [打开] │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ 待处理 ─────────────────────────────────────────────────┐ │
│ │ ⚠️ 3 个模板缺少必填变量                    [去配置]       │ │
│ │ ⚠️ 2 个特种作业证书即将到期                 [查看]        │ │
│ │ ⚠️ 5 个隐患整改超期                         [处理]        │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 5.10 动效规范

1. **页面切换**：无动画（即时响应 > 花哨过渡）
2. **侧边栏折叠**：200ms 宽度过渡（ease-out）
3. **下拉菜单**：150ms 淡入（motion-safe 包裹）
4. **数据加载**：骨架屏（不是转圈，是内容占位）
5. **危险操作**：按钮微动效 + 二次确认弹窗
6. **避免 ornamental motion**：没有粒子、没有悬浮卡片、没有装饰性动效

---

## 六、资料分类体系（用户完全自主）

### 6.1 核心原则
- **没有强制预置分类**。A1-A15只是建筑行业常见的归档参考，不是系统硬性要求。
- 用户第一次打开模板库，分类是空的，必须通过以下三种方式之一创建分类：
  1. **扫描本地文件夹**（推荐）：选择本地资料文件夹，系统按实际文件夹结构自动创建分类树。
  2. **手动新建**：在分类树右键菜单/底部按钮手动创建一级/子分类。
  3. **使用推荐分类**（可选）：在设置里一键导入A1-A15作为初始模板，用户可以随时删改。
- **所有分类都能改名、删除**，不分"内置"或"自定义"。删除分类时级联删除其子分类和下属模板（有二次确认）。
- 扫描文件夹时，严格按照本地文件夹层级创建分类树：
  - 选中的文件夹，其直接子文件夹 = 一级分类
  - 子文件夹的子文件夹 = 二级/三级分类
  - 文件挂在其所在的最底层文件夹分类下
  - 根目录下直接放置的文件 → 放到"未分类"分类中
  - 空文件夹不创建分类
  - 只有一个文件的文件夹也正常创建分类，不折叠
  - 同名文件夹已存在 → 复用，不重复创建

### 6.2 分类表结构（categories）

```typescript
export interface CategoryRecord extends BaseEntity {
  id: string                    // 主键
  name: string                  // 分类名称（文件夹名）
  parentId: string | null       // 父分类ID，null为一级
  sortOrder: number             // 排序序号
  icon?: string                 // 图标名（lucide）
  path?: string                 // 原始文件夹路径（扫描时记录，方便后续同步）
  source: 'manual' | 'scan'     // 来源：手动创建/扫描导入
  description?: string
}
```

索引：`&id, parentId, sortOrder, [parentId+sortOrder]`

### 6.3 分类树组件要求（CategoryTree.tsx）
- 默认收起为图标栏（w-11），点击展开按钮展开为浮层面板（w-36~40，absolute定位z-20），不挤压右侧内容区。
- 支持：展开/折叠、点击选中、右键菜单（新增子分类/重命名/删除）、底部"新建一级分类"按钮。
- 选中分类高亮，hover显示tooltip（分类名全称）。
- 删除分类时弹窗确认："确定删除 [分类名] 及其下 X 个子分类、Y 个模板吗？此操作不可撤销。"

---

## 七、数据库表结构（schema.ts + types/db.ts）

共40+张表。所有表使用自增id作为主键（++id），时间戳统一用毫秒数字，照片/文件用Blob/ArrayBuffer。每张表对应一个TypeScript interface和一个Repository类。

核心表（完整字段定义见PROJECT_SPEC v1版，此处列关键表名）：

**7.1 项目域**：projects, project_personnel, subcontractors, subcontractor_fines
**7.2 人员域**：workers, worker_certs, education_records, training_records, training_attendees, daily_meetings, tech_disclosures, disclosure_attendees
**7.3 现场业务域**：daily_logs, inspections, hazard_projects, hazard_project_inspections, hazard_identifications, acceptances, ppe_items, ppe_distributions, safety_checks, safety_costs, accidents, dangerous_work_permits, safety_meetings, night_patrols, talks_records, correspondences, safety_responsibility, major_activities
**7.4 应急域**：emergency_plans, emergency_drills, emergency_supplies
**7.5 考核域**：score_records
**7.6 模板生成域**：categories, templates, generations
**7.7 知识库域**：knowledge_docs, knowledge_chunks
**7.8 系统域**：settings（键值对）, reminders, operation_logs, sync_queue

每张表的完整字段定义参照v1版本文档第7章。新增表字段已在v1基础上补全safety_costs/accidents/dangerous_work_permits/safety_meetings/night_patrols/talks_records/correspondences/hazard_identifications/safety_responsibility/major_activities/operation_logs/sync_queue。

（本节补充模板分类与模板表核心结构，作为开发直接依据）

### 7.6 模板生成域核心表结构

#### 7.6.1 categories（模板分类表）

```typescript
export interface CategoryRecord {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  sortOrder: number;
  isBuiltin: boolean;
  icon?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}
```

**分类树规则**：
- 预置 A1-A15 一级分类（对应建筑工程安全资料归档标准）
- 每个一级分类下可建二级自定义文件夹
- 用户可新增/重命名/删除自定义分类，但不可删除系统预置分类
- 删除自定义分类前，必须将其下模板移动到其他分类或标记为未分类

#### 7.6.2 templates（模板表）

```typescript
export interface TemplateRecord {
  id: string;
  name: string;
  categoryId: string;
  categoryPath?: string;
  fileType: 'docx' | 'xlsx' | 'html';
  contentType: 'complex' | 'ledger';
  fileBlob: Blob;
  fileName: string;
  fileSize: number;
  variables: TemplateVariable[];
  variableMappings?: VariableMapping[];
  ledgerConfig?: LedgerConfig;
  isBuiltin: boolean;
  version: number;
  usageCount: number;
  lastUsedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVariable {
  name: string;
  displayName: string;
  type: 'scalar' | 'loop' | 'image' | 'condition';
  rawTag: string;
  isRequired: boolean;
  defaultSource?: VariableMapping;
}

export interface VariableMapping {
  variableName: string;
  source: 'field' | 'extraField' | 'statistic' | 'related' | 'ai' | 'currentUser' | 'currentDate' | 'formula' | 'manual';
  table?: string;
  field?: string;
  extraFieldKey?: string;
  statisticKey?: string;
  queryKey?: string;
  prompt?: string;
  format?: string;
  expr?: string;
}
```

### 7.x 数据库索引策略

Dexie schema声明中必须建立的索引：projects(status,name), workers(projectId, subcontractorId, status), inspections(projectId, foundDate, status, hazardType), daily_logs(projectId, logDate), templates(categoryId, isBuiltin), generations(projectId, createdAt), knowledge_chunks(docId), operation_logs(projectId, createdAt), dangerous_work_permits(projectId, status, expireTime), reminders(isRead, dueDate), sync_queue(syncStatus)。

### 7.x 数据库版本迁移

src/db/migrations/下每个版本一个文件v{N}_xxx.ts，导出{version, up(db)}。db/index.ts启动时按version排序自动执行。已发布的迁移脚本永不修改。

---

## 八、表单动态化设计（react-hook-form + zod）

### 8.1 表单定义双层结构

每个业务表单由两部分定义：

1. **zod schema**（数据校验+类型推导）：
```typescript
// src/config/forms/safety-log.ts
import { z } from 'zod'

export const dailyLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确'),
  weather: z.enum(['晴','阴','多云','小雨','大雨','雪','雾'], { required_error: '必选' }),
  temperature: z.string().optional(),
  constructionAreas: z.array(z.string()).default([]),
  mainContent: z.string().min(1, '主要施工内容不能为空'),
  inspectionContent: z.string().optional(),
  issues: z.string().optional(),
  recorderName: z.string().default(''),
})
export type DailyLogFormValues = z.infer<typeof dailyLogSchema>
```

2. **uiSchema**（界面配置：控件类型、标签、占位符、选项来源、行数等）：
```typescript
export const dailyLogUiSchema = {
  fields: [
    { key: 'logDate', label: '日期', type: 'date', required: true, defaultValue: 'today' },
    { key: 'weather', label: '天气', type: 'select', options: 'weather', required: true },
    { key: 'temperature', label: '温度', type: 'text', placeholder: '如 18-28℃' },
    { key: 'constructionAreas', label: '施工部位', type: 'multiselect', optionsSource: 'construction_areas' },
    { key: 'mainContent', label: '主要施工内容', type: 'textarea', rows: 3, required: true },
    { key: 'inspectionContent', label: '安全巡查情况', type: 'textarea', rows: 3 },
    { key: 'issues', label: '存在问题', type: 'textarea', rows: 2 },
    { key: 'recorderName', label: '记录人', type: 'text', defaultValue: 'current_user' },
  ]
}
```

### 8.2 支持的字段type

- text / textarea / number
- select / multiselect / radio / checkbox / switch
- date / daterange（基于date-picker）
- photo（照片上传，1-9张，自动压缩）
- file（任意文件上传）
- worker-select（人员选择器，异步加载花名册）
- subcontractor-select（分包单位选择器）
- signature（签名，canvas绘制）
- dynamic-list（动态列表，可增删行，如培训参与人员）
- custom（渲染自定义React组件，用于复杂字段）

### 8.3 DynamicForm组件工作方式

```tsx
<DynamicForm
  schema={dailyLogSchema}
  uiSchema={dailyLogUiSchema}
  defaultValues={initialData}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  autoSaveKey="daily_log_draft"  // 启用自动保存
/>
```

内部实现：
- 使用useForm({resolver: zodResolver(schema)})
- 根据uiSchema.fields遍历，按type选对应渲染组件（用FormFieldRenderer分发）
- FormFieldRenderer根据type映射到shadcn组件（type='text'→Input，type='textarea'→Textarea，type='select'→Select，等等）
- 提交时自动校验，错误信息通过FormMessage显示在对应字段下方

### 8.4 用户自定义表单

- FormConfigPage允许用户新增/删除/重排字段、修改标签、设置必填
- 自定义字段存储到对应表的extraFields: Record<string, unknown> JSON字段
- zod schema通过z.object().extend()动态扩展
- uiSchema通过合并用户自定义配置动态生成
- 模板变量映射时可选择extraFields中的字段

---

## 九、模板与生成体系（重构版 v3.0）

**核心哲学：变量一次配置，所有模板通用；数据在项目里填一次，生成时自动替换。**

### 9.1 全局变量库（Variable Library）v4.0

**核心设计原则：用户永远看不到 `{{}}` 和英文变量名，只看到中文标签和实际值。**

变量在"设置 → 台账变量"中管理。变量不再需要用户理解 `{{projectName}}` 这种技术语法——系统自动处理模板匹配。

#### 9.1.1 变量模型（GlobalVariable v4.0）

```typescript
export interface GlobalVariable {
  id: string
  label: string              // 中文显示名，如"项目名称"——用户唯一看到的名字
  value: string              // 当前实际值
  source: 'project' | 'manual' | 'currentDate'
  projectField?: string      // 项目表字段名
  extraFieldKey?: string     // 扩展字段 key
  isBuiltIn: boolean
  sortOrder: number
}
```

#### 9.1.2 内置变量清单（21 项 + 2 辅助变量）

| 序号 | 显示名 | 来源 | 对应字段 |
|------|-------|------|---------|
| 1 | 项目名称 | 项目信息 | projects.name |
| 2 | 项目编号 | 项目信息 | projects.code |
| 3 | 项目地点 | 项目信息 | projects.location |
| 4 | 建设单位 | 项目信息 | projects.owner |
| 5 | 施工单位 | 项目信息 | projects.contractor |
| 6 | 监理单位 | 项目信息 | projects.supervisor |
| 7 | 设计单位 | 项目信息 | projects.extraFields.designUnit |
| 8 | 勘察单位 | 项目信息 | projects.extraFields.surveyUnit |
| 9 | 项目经理 | 项目信息 | projects.managerName |
| 10 | 技术负责人 | 项目信息 | projects.techDirector |
| 11 | 安全负责人 | 项目信息 | projects.extraFields.safetyDirector |
| 12 | 安全员 | 项目信息 | projects.safetyOfficer |
| 13 | 质量负责人 | 项目信息 | projects.extraFields.qualityDirector |
| 14 | 质量员 | 项目信息 | projects.extraFields.qualityInspector |
| 15 | 生产经理 | 项目信息 | projects.extraFields.productionManager |
| 16 | 施工员 | 项目信息 | projects.extraFields.constructionWorker |
| 17 | 测量员 | 项目信息 | projects.extraFields.surveyor |
| 18 | 试验员 | 项目信息 | projects.extraFields.tester |
| 19 | 开工日期 | 项目信息 | projects.startDate |
| 20 | 竣工日期 | 项目信息 | projects.endDate |
| 21 | 工期 | 项目信息 | 自动计算 |
| — | 当前日期 | 系统自动 | 生成当天日期 |
| — | 编制人 | 手动填写 | 用户自行输入 |

#### 9.1.3 变量设置页 UI 设计（小白友好）

变量设置页展示为一张清晰的表格：

| 序号 | 变量名称 | 当前值 | 来源 | 操作 |
|------|---------|--------|------|------|

- **灰色行** = 内置变量，值来自项目信息，点击"在项目信息中修改"跳转到项目管理页
- **白色行** = 自定义变量，点击"编辑"直接修改值
- 来源列用彩色标签显示：蓝色=项目信息、绿色=系统自动、琥珀色=手动填写
- 页面底部有"怎么用？"使用说明，用中文解释变量用途
- 用户不需要知道 `{{}}` 语法、不需要知道英文变量名、不需要知道字段映射

#### 9.1.4 项目表单与变量的联动

- 项目表单分两块：
  1. **固定字段区**：项目名称、编号、地点、参建单位、项目经理、技术负责人、安全员、开工/竣工日期
  2. **扩展字段区**：所有 `source=project` 且 `extraFieldKey` 的变量，自动在这里生成输入框（中文标签，placeholder 为"请输入XXX"）
- 不再显示 `{{变量名}}` 这种技术语法

---

### 9.2 模板库页面（TemplateLibraryPage v3.0）

#### 9.2.1 布局（左右分栏 + 顶部操作栏）

```
┌─────────────────────────────────────────────────────────┐
│ 生成文档                                  [导入] [扫描]  │
├─────────────────────────────────────────────────────────┤
│ [搜索框..............................................]  │
├──────────┬────────────────────────────────────────────┤
│ 分类     │                                            │
│ ▶ A1     │ ☑ 安全检查表.docx                [生成]    │
│ ▶ A2     │ ☑ 隐患整改单.docx                [生成]    │
│ ▼ A11    │ ☐ 教育培训记录.docx              [生成]    │
│   子分类  │ ☑ 临时用电方案.docx              [生成]    │
│ 未分类    │                                            │
├──────────┴────────────────────────────────────────────┤
│ [全选] 已选 3 个                          [批量生成]   │
└─────────────────────────────────────────────────────────┘
```

- 左侧分类树只显示根目录文件夹，鼠标悬停时浮出子文件夹面板
- 点击根分类，右侧显示该根下所有子分类的模板；点击子分类只显示该子分类模板
- 右侧模板列表每项有复选框、文件名、变量数、生成按钮
- 顶部操作栏：标题 + flex-1占位 + 导入/扫描按钮（都加flex-shrink-0）
- 搜索框独占第二行
- 选中模板后底部出现批量操作栏

#### 9.2.2 模板列表项

每个模板项显示：
- 复选框（用于批量选择）
- 文件图标（Word蓝色 / Excel绿色）
- 文件名（截断）
- 变量数小标签
- 操作按钮：[生成] [变量映射] [删除]

点击整行进入模板详情（变量映射查看/编辑、删除、预览变量）。所有模板都能删除，点删除弹确认框。

#### 9.2.3 操作按钮
- **+ 导入**：导入单个docx/xlsx文件，弹文件选择框，选完后弹导入确认框
- **📁 扫描/同步文件夹**：进入 FolderImportDialog 四步向导（见9.4）
- **批量生成**：选中多个模板后，点击批量生成，打包成ZIP下载

---

### 9.3 单文件导入流程

```
点"导入"按钮
  ↓
隐藏的<input type="file" accept=".docx,.xlsx">触发click
  ↓
用户选文件 → readFile读取ArrayBuffer
  ↓
variable-extractor扫描{{xxx}}变量
  ↓
弹导入确认Dialog：
  - 文件名、大小、变量列表
  - 选择目标分类（下拉，默认"未分类"或当前选中分类）
  - 变量列表显示"已匹配到全局变量"/"未匹配（需手动处理）"状态
  ↓
确认保存到IndexedDB
```

---

### 9.4 文件夹导入向导（FolderImportDialog，四步流程）

模仿文件夹同步体验，全程有进度条，不让用户卡死。

#### Step 1：选择文件夹

```
┌─────────────────────────────────────┐
│  📁 导入本地资料文件夹               │
│  ─────────────────────────────────  │
│                                     │
│     [📂 选择文件夹]                  │
│                                     │
│  选择你的安全资料根目录（如"一分公司  │
│  内业资料"），系统将：               │
│  • 按文件夹结构自动创建分类          │
│  • 识别所有Word/Excel模板中的变量    │
│  • 导入后可一键生成文档              │
│                                     │
│  支持格式：.docx .xlsx               │
└─────────────────────────────────────┘
```

优先使用`showDirectoryPicker`（File System Access API），不支持自动降级到`<input webkitdirectory>`。

#### Step 2：扫描中（分两阶段进度）

```
┌─────────────────────────────────────┐
│  🔍 正在扫描文件夹...               │
│  ─────────────────────────────────  │
│                                     │
│  阶段 1/2：遍历文件夹结构            │
│  [████████████░░░░] 72%             │
│  当前：A1安全策划/02危险源清单/       │
│                                     │
│  已发现 36 个文件夹，128 个文件      │
│                                     │
│  [取消]                             │
└─────────────────────────────────────┘
```

遍历完文件自动进入阶段2：

```
┌─────────────────────────────────────┐
│  🔍 正在解析模板变量...             │
│  ─────────────────────────────────  │
│                                     │
│  阶段 2/2：解析Word变量              │
│  [████████████████░░] 85%           │
│  当前：三级安全教育记录表.docx       │
│                                     │
│  已解析 109/128，识别变量 312 个     │
│                                     │
│  [取消]                             │
└─────────────────────────────────────┘
```

技术要求：
- 遍历文件每20个yield一次主线程（setTimeout/requestIdleCallback）
- 解析变量每批3个文件yield一次
- 单文件解析超时30秒标记失败继续下一个
- 进度条实时更新，UI不冻结

#### Step 3：结果预览（文件夹树）

```
┌─────────────────────────────────────┐
│  ✅ 扫描完成                        │
│  ─────────────────────────────────  │
│  新建分类 13  新增模板 108           │
│  重复 20      失败 0                │
│                                     │
│  重复文件处理：[跳过重复 ▼]          │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ▼ 📁 A1安全策划 (12)        │    │
│  │   📄 安全策划书.docx  ✅ 5  │    │
│  │   📄 危险源清单.docx  ✅ 8  │    │
│  │   📄 ...                    │    │
│  │ ▶ 📁 A2安全目标 (8)         │    │
│  │ ▶ 📁 A3施工组织设计 (15)    │    │
│  └─────────────────────────────┘    │
│                                     │
│  [取消]              [确认导入]      │
└─────────────────────────────────────┘
```

- 文件夹可折叠/展开，每个文件夹右侧显示文件数
- 文件右侧：✅变量数（已匹配）/ ⚠️变量数（有未匹配变量）/ ❌失败
- 重复文件有黄色"重复"标签
- 默认选中所有新文件，可勾选/取消
- 底部统计固定，不随列表滚动

#### Step 4：导入完成

```
┌─────────────────────────────────────┐
│  🎉 导入成功！                      │
│  ─────────────────────────────────  │
│  创建分类 13 个                     │
│  导入模板 108 个                    │
│  跳过重复 20 个                     │
│  解析失败 0 个                      │
│                                     │
│  [查看模板库]    [再导入一个文件夹]  │
└─────────────────────────────────────┘
```

---

### 9.5 变量提取与自动匹配

#### 9.5.1 提取规则

`variable-extractor.service.ts` 正则扫描：
- `{{varName}}` / `{{varName|filter}}` → 简单变量
- `{#loopName}` ... `{/loopName}` → 循环块（MVP阶段仅识别，映射到列表数据；复杂列表后期做）
- `{%imgName}` → 图片变量（MVP阶段暂不实现，跳过并提示）

中文变量名也支持（如`{{项目经理}}`）。

#### 9.5.2 自动匹配逻辑

提取到变量名后，去全局变量库匹配：
1. 精确匹配`varNames`数组中任意一个别名 → 自动绑定，绿色✅
2. 变量名是中文（如`项目经理`）→ 匹配label字段 → 自动绑定
3. 未匹配到 → 标记为"未匹配"，用户可以：
   - 在变量映射弹窗中手动绑定到已有变量
   - 新建一个全局变量（自动加入变量库，以后所有模板可用）
   - 设为"生成时手动填写"

---

### 9.6 文档生成流程

#### 9.6.1 单模板生成

```
用户在模板列表点"生成"
  ↓
确认当前项目project（从全局store取，如未选弹选择项目框）
  ↓
generate.service.renderSingle(templateId, projectId)
  1. 读取template，获取所有变量
  2. 读取project数据（含extraFields）和settings（编制人等）
  3. 按globalVariable.sourceType解析每个变量的值
  4. 收集缺失的required变量和manualInput变量
  ↓
如有缺失/manualInput变量 → 弹ManualFillDialog补填
  ↓
docxtemplater渲染 → Blob
  ↓
downloadBlob(blob, fileName)
  - 桌面环境：触发浏览器下载 a.click() 或 Electron 保存对话框
  - 浏览器环境：触发下载 a.click()
```

#### 9.6.2 批量生成

用户在模板列表勾选多个模板后点击"批量生成"：

```
选中 N 个模板
  ↓
generate.service.renderBatch(templateIds, projectId)
  1. 遍历每个模板调用 renderSingle
  2. 成功的加入 JSZip
  3. 失败的记录错误原因
  4. 跳过的（需手动变量或缺少必填）单独统计
  ↓
生成 ZIP 文件：批量生成_YYYY-MM-DD.zip
  ↓
自动触发下载
  ↓
弹出结果面板：成功 X 个 / 跳过 Y 个 / 失败 Z 个
```

批量生成要求：
- 每个模板独立try-catch，一个失败不影响其他
- 结果面板显示每个模板的生成状态
- ZIP文件名包含日期
- 只有成功生成的文件才打包

#### 9.6.3 变量取值规则

| sourceType | 取值方式 |
|-----------|---------|
| projectField | `project[sourceConfig.fieldKey]` |
| projectExtraField | `project.extraFields?.[sourceConfig.fieldKey]` |
| currentDate | dayjs().format(format) |
| staticText | `sourceConfig.staticValue`（编制人从settings读）|
| manualInput | 弹框让用户输入，填完继续 |
| 工期(constructionPeriod特殊处理) | `${format(startDate)} 至 ${format(endDate)} 共${days}天` |

#### 9.6.4 方案类文档的AI写作（见第十二章）
当模板类型为"方案类"（或用户点击"AI写作"按钮），生成流程变为：
1. 先替换变量生成基础文档
2. 调用RAG知识库检索相关规范/范本
3. 调用DeepSeek API根据知识库内容补充/扩展文档正文
4. 将AI生成内容插入文档中标记位置
（详见第十二章RAG方案）

---

### 9.7 涉及文件清单（v3.0）

```
src/
├── config/
│   └── features.ts                  ← 功能开关（新增）
├── components/business/
│   ├── CategoryTree.tsx             ← 分类树（重构：浮层展开、默认收起）
│   ├── FolderImportDialog.tsx       ← 四步文件夹导入向导（新增）
│   ├── ManualFillDialog.tsx         ← 手动补填变量弹窗
│   └── VariableMappingPopover.tsx   ← 单个模板变量映射气泡（轻量）
├── pages/templates/
│   └── TemplateLibraryPage.tsx      ← 模板库（重构：文件夹列表视图）
├── pages/settings/
│   └── VariableSettingsPage.tsx     ← 全局变量库设置页
├── services/
│   ├── template-import.service.ts   ← 重写：分批yield+进度回调
│   ├── variable-extractor.service.ts ← 变量提取（支持中文变量名）
│   ├── variable-settings.service.ts ← 全局变量CRUD+初始化种子
│   ├── generate.service.ts          ← 重写：按globalVariable取值
│   └── ai-writing.service.ts        ← AI写作/RAG调用（新增）
├── db/repositories/
│   ├── category.repo.ts             ← 分类（去掉isBuiltin限制、级联删除）
│   └── template.repo.ts             ← 模板
└── core/
    └── constants.ts                ← 全局常量 + downloadBlob 工具函数
```

---
## 十、标准合规台账自动化引擎（Ledger Automation Engine）

**核心目标**：让数据库记录成为唯一事实来源（SSOT），任何《三级教育花名册》《隐患排查治理台账》《分包单位管理台账》等高频流水台账，均通过结构化数据实时渲染生成，杜绝“数据库一套、Word/Excel台账另一套”的核对灾难。

### 10.1 台账映射模型（Ledger Mapping Model）

#### 10.1.1 templates 表扩展字段

在原有 `templates` 表基础上，增加 `ledgerConfig` 字段以区分复杂排版文档与标准流水台账：

```typescript
export interface TemplateRecord {
  id: string;
  name: string;
  categoryCode: string;        // A1-A15 分类
  fileType: 'docx' | 'xlsx' | 'html';
  contentType: 'complex' | 'ledger'; // complex=复杂排版文档；ledger=标准流水台账
  fileBlob: Blob;              // 模板二进制
  variableMappings?: VariableMapping[]; // 复杂文档的变量映射
  ledgerConfig?: LedgerConfig; // 标准台账专属配置
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface LedgerConfig {
  ledgerType: 'excel' | 'word-table' | 'html-to-word';
  // 数据源定义：单表、关联查询或统计函数
  dataSource: {
    type: 'table' | 'query' | 'service';
    table?: string;            // 例如 'workers'
    queryKey?: string;         // 例如 'getEducationLedger'
    serviceMethod?: string;    // 例如 'EducationService.getLedger'
    params?: Record<string, unknown>; // 固定参数
  };
  // 表头绑定：支持多行表头、合并单元格
  headerRows: HeaderRow[];
  // 循环体：每行数据如何映射到表格行
  bodyRow: BodyRow;
  // 表尾绑定：合计、统计、签字区
  footerRows?: FooterRow[];
  // 样式令牌：字号、边框、列宽、打印区域
  styleToken: string;
  // 防伪与追溯
  provenance: {
    enabled: boolean;
    mode: 'footer' | 'watermark' | 'both';
    textTemplate: string;      // 例："本台账由溜哥的安全管理平台于 {{generatedAt}} 自动生成，项目：{{projectName}}"
  };
}

export interface HeaderRow {
  cells: HeaderCell[];
  height?: number;
  style?: CellStyle;
}

export interface HeaderCell {
  title: string;
  colSpan?: number;
  rowSpan?: number;
  field?: string;              // 映射数据源字段（表头本身也可能来自数据，如动态月份）
  style?: CellStyle;
}

export interface BodyRow {
  cells: BodyCell[];
  height?: number;
  style?: CellStyle;
  // 数据过滤：例如只导出 status !== 'deleted'
  filterExpr?: string;
  // 排序：例如 ['teamName asc', 'name asc']
  sortBy?: string[];
}

export interface BodyCell {
  field: string;               // 数据字段路径，支持 'person.name'
  type: 'text' | 'number' | 'date' | 'enum' | 'image' | 'formula' | 'index';
  enumMap?: Record<string, string>; // 例如 {found:'待整改', closed:'已闭环'}
  dateFormat?: string;         // 'YYYY-MM-DD'
  formula?: string;            // excel公式，如 '=C{{row}}*D{{row}}'
  width?: number;
  align?: 'left' | 'center' | 'right';
  style?: CellStyle;
}

export interface FooterRow {
  cells: FooterCell[];
  height?: number;
  style?: CellStyle;
}

export interface FooterCell {
  type: 'label' | 'statistic' | 'formula' | 'signature';
  value?: string;
  statisticKey?: string;       // 例如 'totalCount', 'rectifiedCount'
  formula?: string;
  colSpan?: number;
  align?: 'left' | 'center' | 'right';
  style?: CellStyle;
}

export interface CellStyle {
  fontSize?: number;
  bold?: boolean;
  color?: string;
  bgColor?: string;
  border?: 'thin' | 'medium' | 'thick';
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'middle' | 'bottom';
}
```

#### 10.1.2 绑定规则总览

| 区域 | 绑定目标 | 规则 |
|------|---------|------|
| 表头 | 固定文本 / 数据字段 / 动态枚举 | `HeaderCell.title` 优先；若 `field` 存在，则从首行数据或 `params` 中取值 |
| 循环体 | 数据行数组 | `BodyRow` 按数组长度自动扩展行数；`BodyCell.field` 支持 `a.b` 路径和 `{{row}}` 占位符 |
| 表尾 | 统计 / 公式 / 签名 | `FooterCell.statisticKey` 由 Service 预计算后注入；`signature` 渲染图片或文字占位 |
| 样式 | 模板预置令牌 | `styleToken` 对应 `ledger-style-presets.ts` 中的预设，确保全局样式统一 |

#### 10.1.3 典型台账映射示例

**《三级教育花名册》**

```typescript
const educationLedgerConfig: LedgerConfig = {
  ledgerType: 'excel',
  dataSource: { type: 'query', queryKey: 'getEducationLedger' },
  headerRows: [
    {
      cells: [
        { title: '序号', rowSpan: 2 },
        { title: '姓名', rowSpan: 2 },
        { title: '身份证号', rowSpan: 2 },
        { title: '工种', rowSpan: 2 },
        { title: '分包单位', rowSpan: 2 },
        { title: '三级安全教育', colSpan: 3 },
        { title: '签字', rowSpan: 2 },
      ],
    },
    {
      cells: [
        { title: '公司级' }, { title: '项目级' }, { title: '班组级' },
      ],
    },
  ],
  bodyRow: {
    cells: [
      { field: '$index', type: 'index', width: 8, align: 'center' },
      { field: 'workerName', type: 'text', width: 12 },
      { field: 'idCard', type: 'text', width: 20 },
      { field: 'jobType', type: 'enum', enumMap: jobTypeMap, width: 12 },
      { field: 'subcontractorName', type: 'text', width: 20 },
      { field: 'companyEduDate', type: 'date', dateFormat: 'YYYY-MM-DD', width: 14 },
      { field: 'projectEduDate', type: 'date', dateFormat: 'YYYY-MM-DD', width: 14 },
      { field: 'teamEduDate', type: 'date', dateFormat: 'YYYY-MM-DD', width: 14 },
      { field: 'signatureImage', type: 'image', width: 14 },
    ],
    sortBy: ['subcontractorName asc', 'workerName asc'],
  },
  footerRows: [
    {
      cells: [
        { type: 'label', value: '合计人数', colSpan: 8, align: 'right' },
        { type: 'statistic', statisticKey: 'totalCount', align: 'center' },
      ],
    },
  ],
  styleToken: 'a4-landscape-standard',
  provenance: {
    enabled: true,
    mode: 'footer',
    textTemplate: '本台账由溜哥的安全管理平台于 {{generatedAt}} 自动生成，项目：{{projectName}}，共 {{totalCount}} 人',
  },
};
```

---

### 10.2 动态表格渲染引擎选型与实现

#### 10.2.1 Excel 台账：SheetJS vs ExcelJS

| 维度 | SheetJS (xlsx) | ExcelJS |
|------|----------------|---------|
| 包体积 | 约 500KB（可 tree-shake） | 约 1.2MB |
| 样式支持 | 付费版 `xlsx-style` 才支持完整样式 | 原生完整支持样式、边框、合并单元格、图片 |
| 公式支持 | 可写入公式字符串 | 原生公式计算支持 |
| 数据校验 | 需手写 XML 扩展 | 原生支持下拉框、数据验证 |
| 浏览器兼容 | 优秀，Chromium 120+ 无问题 | 优秀 |
| 模板读取 | 强：可直接读 `.xlsx` 模板 | 强 |
| 维护活跃度 | 高 | 高 |

**推荐方案：ExcelJS**

理由：标准合规台账对样式、合并单元格、下拉框、打印区域要求严苛，ExcelJS 原生支持完整样式，避免付费版依赖和手写 XML 的脆弱性。体积差异在桌面端可忽略。

#### 10.2.2 Excel 台账渲染流程

```typescript
// services/ledger-excel.service.ts
import ExcelJS from 'exceljs';

export class LedgerExcelService {
  /**
   * 渲染标准台账Excel
   */
  async renderLedger(options: RenderLedgerOptions): Promise<Blob> {
    const { projectId, templateId, extraParams = {} } = options;

    // 1. 读取模板与配置
    const template = await templateRepo.get(templateId);
    const config = template.ledgerConfig!;

    // 2. 实时拉取数据（SSOT）
    const { rows, statistics } = await this.fetchData(projectId, config.dataSource, extraParams);

    // 3. 加载模板或新建工作簿
    const workbook = template.fileBlob
      ? await this.loadTemplate(template.fileBlob)
      : new ExcelJS.Workbook();
    const worksheet = workbook.getWorksheet(1) ?? workbook.addWorksheet('台账');

    // 4. 写入表头
    this.renderHeader(worksheet, config.headerRows);

    // 5. 写入循环体
    this.renderBody(worksheet, rows, config.bodyRow, config.headerRows.length);

    // 6. 写入表尾
    if (config.footerRows) {
      this.renderFooter(worksheet, config.footerRows, statistics, rows.length);
    }

    // 7. 应用样式预设
    this.applyStylePreset(worksheet, config.styleToken);

    // 8. 写入防伪追溯信息
    this.writeProvenance(worksheet, config.provenance, { projectId, rows, statistics });

    // 9. 设置打印区域与列宽
    this.applyPageSetup(worksheet, config.styleToken);

    // 10. 输出 Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private async fetchData(
    projectId: string,
    dataSource: LedgerConfig['dataSource'],
    extraParams: Record<string, unknown>
  ): Promise<{ rows: Record<string, unknown>[]; statistics: Record<string, unknown> }> {
    switch (dataSource.type) {
      case 'table':
        return ledgerDataService.queryTable({ projectId, table: dataSource.table!, params: dataSource.params, extraParams });
      case 'query':
        return ledgerDataService.executeQuery({ projectId, queryKey: dataSource.queryKey!, params: dataSource.params, extraParams });
      case 'service':
        return ledgerDataService.callService({ projectId, method: dataSource.serviceMethod!, params: dataSource.params, extraParams });
      default:
        throw new ServiceError('E1001', '未知台账数据源类型');
    }
  }

  private renderHeader(ws: ExcelJS.Worksheet, headerRows: HeaderRow[]) {
    headerRows.forEach((row, rIndex) => {
      const excelRow = ws.getRow(rIndex + 1);
      let colIndex = 1;
      row.cells.forEach((cell) => {
        const excelCell = excelRow.getCell(colIndex);
        excelCell.value = cell.title;
        this.applyCellStyle(excelCell, cell.style);
        if (cell.colSpan || cell.rowSpan) {
          ws.mergeCells(rIndex + 1, colIndex, rIndex + (cell.rowSpan ?? 1), colIndex + (cell.colSpan ?? 1) - 1);
        }
        colIndex += cell.colSpan ?? 1;
      });
      if (row.height) excelRow.height = row.height;
    });
  }

  private renderBody(
    ws: ExcelJS.Worksheet,
    rows: Record<string, unknown>[],
    bodyRow: BodyRow,
    startRow: number
  ) {
    rows.forEach((dataRow, idx) => {
      const excelRow = ws.getRow(startRow + idx + 1);
      if (bodyRow.height) excelRow.height = bodyRow.height;
      bodyRow.cells.forEach((cell, cIdx) => {
        const excelCell = excelRow.getCell(cIdx + 1);
        excelCell.value = this.resolveCellValue(dataRow, cell, idx + 1);
        this.applyCellStyle(excelCell, cell.style);
        // 数据校验：下拉框
        if (cell.type === 'enum' && cell.enumMap) {
          excelCell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${Object.values(cell.enumMap).join(',')}"`],
          };
        }
      });
    });
  }

  private resolveCellValue(dataRow: Record<string, unknown>, cell: BodyCell, rowIndex: number): ExcelJS.CellValue {
    if (cell.type === 'index') return rowIndex;
    const raw = getValueByPath(dataRow, cell.field);
    if (cell.type === 'enum' && cell.enumMap) {
      const key = String(raw);
      return cell.enumMap[key] ?? key;
    }
    if (cell.type === 'date' && typeof raw === 'number') {
      return formatDate(raw, cell.dateFormat ?? 'YYYY-MM-DD');
    }
    if (cell.type === 'image' && raw) {
      return '[图片]'; // ExcelJS 通过 addImage 单独处理图片
    }
    return raw as ExcelJS.CellValue;
  }
}
```

#### 10.2.3 Word 台账：docxtemplater 表格循环方案

对于 Word 版台账，优先使用 `docxtemplater` 的表格行循环特性：

**模板语法**

```docx
| 序号 | 隐患描述 | 隐患等级 | 责任人 | 整改期限 | 状态 |
|------|---------|---------|--------|---------|------|
| {#hazards}{idx} | {description} | {levelText} | {responsiblePerson} | {deadline\|date:'YYYY-MM-DD'} | {statusText} |
| {/hazards} |  |  |  |  |  |
```

关键点：
- 循环行必须放在表格同一行内，以 `{#hazards}` 开头、`{/hazards}` 结尾
- `docxtemplater` 会自动复制整行，包括表格样式
- 表头样式在模板中预置，导出时保留

**Service 层渲染**

```typescript
// services/ledger-word.service.ts
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export class LedgerWordService {
  async renderLedger(options: RenderLedgerOptions): Promise<Blob> {
    const { projectId, templateId, extraParams = {} } = options;
    const template = await templateRepo.get(templateId);
    const config = template.ledgerConfig!;

    const { rows, statistics } = await ledgerDataService.fetch(projectId, config.dataSource, extraParams);
    const project = await projectRepo.get(projectId);

    const zip = new PizZip(await template.fileBlob.arrayBuffer());
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render({
      projectName: project.name,
      generatedAt: formatDate(Date.now(), 'YYYY年MM月DD日 HH:mm'),
      totalCount: statistics.totalCount,
      rectifiedCount: statistics.rectifiedCount,
      hazards: rows.map((r, idx) => ({
        idx: idx + 1,
        ...r,
        levelText: hazardLevelMap[String(r.level)],
        statusText: hazardStatusMap[String(r.status)],
      })),
    });

    const buffer = doc.getZip().generate({ type: 'arraybuffer' });
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
}
```

#### 10.2.4 HTML → Word 降维方案（备用）

当 Word 台账样式极复杂（多层级表头、嵌套表格、图文混排）且 `docxtemplater` 难以表达时，采用 **HTML 渲染 + `html-docx-js`（或 `html-to-docx`）** 方案：

```typescript
// services/ledger-html-to-word.service.ts
import HTMLtoDOCX from 'html-to-docx';

export class LedgerHtmlToWordService {
  async renderLedger(options: RenderLedgerOptions): Promise<Blob> {
    const { projectId, templateId, extraParams = {} } = options;
    const template = await templateRepo.get(templateId);
    const config = template.ledgerConfig!;
    const { rows, statistics } = await ledgerDataService.fetch(projectId, config.dataSource, extraParams);

    // 1. 用 React/shadcn Table 渲染为 HTML 字符串（服务端纯函数，无 DOM）
    const html = renderLedgerHtml(config, rows, statistics);

    // 2. 转换为 Word
    const docxBuffer = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    return new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
}
```

**选型结论**：
- **Excel 台账**：一律使用 `ExcelJS`，不采用 SheetJS（样式与校验需求决定）
- **Word 表格台账**：优先 `docxtemplater` 表格循环（保留模板样式，用户可自定义）
- **Word 复杂混排台账**：备用 `html-to-docx` 方案（复杂表头、嵌套表格场景）

---

### 10.3 导出触发机制与数据一致性保障

#### 10.3.1 按需实时渲染（On-demand Rendering）

**触发链路**

```
用户点击"导出标准台账"
  ↓
LedgerExportPage 收集参数（项目ID、台账类型、时间范围、分包单位筛选等）
  ↓
调用 ledger.service.exportLedger(projectId, templateId, params)
  ↓
Service 层实时查询 repositories（使用 useLiveQuery 最新数据或 await 直接查询）
  ↓
根据 ledgerConfig.ledgerType 分发到 LedgerExcelService / LedgerWordService / LedgerHtmlToWordService
  ↓
渲染完成 → Blob → 交付给 downloadBlob() 或编辑器
  ↓
生成 generation_records 记录，保存导出版本、参数、数据快照哈希
```

**核心接口定义**

```typescript
// services/ledger.service.ts
export interface ExportLedgerRequest {
  projectId: string;
  templateId: string;
  // 动态参数：时间范围、分包单位、状态筛选等
  params?: Record<string, unknown>;
  // 导出目标
  target: 'wps-open' | 'download' | 'save-to-dir';
  // 仅 target='save-to-dir' 时有效
  savePath?: string;
}

export interface ExportLedgerResult {
  success: boolean;
  fileName: string;
  fileBlob: Blob;
  filePath?: string;           // 本地保存路径
  generationId: string;        // 关联 generation_records
  dataSnapshotHash: string;    // 数据快照哈希（防篡改追溯）
  generatedAt: number;
}

export class LedgerService {
  constructor(
    private excelRenderer: LedgerExcelService,
    private wordRenderer: LedgerWordService,
    private htmlToWordRenderer: LedgerHtmlToWordService,
    private wpsBridge: WpsBridge,
  ) {}

  async exportLedger(req: ExportLedgerRequest): Promise<ExportLedgerResult> {
    // 1. 校验项目存在
    const project = await projectRepo.get(req.projectId);
    if (!project) throw new ValidationError('项目不存在');

    // 2. 读取模板与台账配置
    const template = await templateRepo.get(req.templateId);
    if (!template || template.contentType !== 'ledger' || !template.ledgerConfig) {
      throw new ValidationError('模板不是标准台账模板或缺少 ledgerConfig');
    }

    // 3. 实时拉取数据并计算统计（SSOT）
    const { rows, statistics } = await ledgerDataService.fetch(
      req.projectId,
      template.ledgerConfig.dataSource,
      req.params ?? {}
    );

    // 4. 根据类型渲染
    let blob: Blob;
    switch (template.ledgerConfig.ledgerType) {
      case 'excel':
        blob = await this.excelRenderer.render({ projectId: req.projectId, templateId: req.templateId, params: req.params });
        break;
      case 'word-table':
        blob = await this.wordRenderer.render({ projectId: req.projectId, templateId: req.templateId, params: req.params });
        break;
      case 'html-to-word':
        blob = await this.htmlToWordRenderer.render({ projectId: req.projectId, templateId: req.templateId, params: req.params });
        break;
      default:
        throw new ServiceError('E1002', '不支持的台账渲染类型');
    }

    // 5. 生成快照哈希
    const snapshot = JSON.stringify({ rows, statistics, params: req.params });
    const dataSnapshotHash = await computeSha256(snapshot);

    // 6. 记录生成日志
    const generationId = await generationRepo.add({
      projectId: req.projectId,
      templateId: req.templateId,
      type: 'ledger-export',
      fileName: this.buildFileName(template, project, req.params),
      dataSnapshotHash,
      params: req.params,
      createdAt: Date.now(),
    });

    // 7. 根据 target 交付
    const result: ExportLedgerResult = {
      success: true,
      fileName: this.buildFileName(template, project, req.params),
      fileBlob: blob,
      generationId,
      dataSnapshotHash,
      generatedAt: Date.now(),
    };

    if (req.target === 'wps-open') {
      await this.wpsBridge.openBlobInWps(blob, result.fileName);
    } else if (req.target === 'download') {
      await this.wpsBridge.downloadBlob(blob, result.fileName);
    } else if (req.target === 'save-to-dir' && req.savePath) {
      result.filePath = await this.wpsBridge.saveBlobToDirectory(blob, req.savePath, result.fileName);
    }

    return result;
  }
}
```

#### 10.3.2 防篡改与追溯

**数据快照哈希**

每次导出时，将本次导出的原始数据（rows + statistics + params）JSON 序列化后计算 SHA-256，存入 `generation_records.dataSnapshotHash`。未来若纸质台账与系统记录不一致，可通过 `generationId` 反查当时导出的完整数据。

```typescript
// utils/crypto.ts
export async function computeSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

**文件内防伪信息**

| 位置 | Excel 实现 | Word 实现 |
|------|-----------|-----------|
| 页脚 | `worksheet.headerFooter.oddFooter` 写入生成信息 | `docxtemplater` 渲染 `{{provenanceFooter}}` |
| 水印 | 工作表背景图片（半透明文字图片） | Word 页眉中插入艺术字/图片水印 |
| 文件名 | `项目简称_三级教育花名册_2026-07-01_143022.xlsx` | `项目简称_隐患排查台账_2026-07-01_143022.docx` |

**页脚文本模板**

```
本台账由溜哥的安全管理平台于 {{generatedAt}} 自动生成 | 项目：{{projectName}} | 数据快照：{{dataSnapshotHash}} | 严禁手工篡改
```

ExcelJS 写入方式：

```typescript
worksheet.headerFooter = {
  oddFooter: `&C&"宋体,常规"&9本台账由溜哥的安全管理平台于 ${generatedAt} 自动生成 | 项目：${projectName} | 数据快照：${hash}`,
};
```

---

### 10.4 文件交付方式（v4.0 独立桌面应用）

生成的文件通过 `downloadBlob()` 工具函数交付给用户，或通过编辑器页面直接打开。

```typescript
// core/constants.ts 中已定义
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
```

**交付选项**：
- **下载到本地**：`downloadBlob(blob, fileName)` → 触发浏览器下载
- **打开编辑器**：跳转到 `/editor/docx` 或 `/editor/xlsx`，Blob 传入编辑器
- **Electron 保存对话框**：通过 `useElectron()` hook 调用原生保存对话框（Phase 1 实现）

在 `LedgerExportPage` 中提供导出选项：

```typescript
// pages/ledger-export/LedgerExportPage.tsx
export function LedgerExportPage() {
  const [templateId, setTemplateId] = useState<string>('');
  const [target, setTarget] = useState<'download' | 'editor'>('download');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const projectId = useProjectStore((s) => s.currentProjectId);

  const handleExport = async () => {
    const result = await ledgerService.exportLedger({
      projectId,
      templateId,
      params,
      target,
    });
    toast.success(`台账已导出：${result.fileName}`);
  };

  return (
    <div className="p-4 space-y-4">
      <TemplateSelector value={templateId} onChange={setTemplateId} contentType="ledger" />
      <LedgerParamForm templateId={templateId} value={params} onChange={setParams} />
      <RadioGroup value={target} onValueChange={(v) => setTarget(v as typeof target)}>
        <RadioGroupItem value="download">下载到本地</RadioGroupItem>
        <RadioGroupItem value="editor">打开编辑器</RadioGroupItem>
      </RadioGroup>
      <Button onClick={handleExport}>导出标准台账</Button>
    </div>
  );
}
```

---

### 10.5 目录与文件新增清单

新增/修改以下文件（严格遵守分层）：

```
src/
├── core/
│   └── constants.ts           ← 全局常量 + downloadBlob 工具函数
├── db/
│   ├── schema.ts              # 扩展 TemplateRecord / LedgerConfig 类型
│   └── repositories/
│       └── template.repo.ts   # 支持 ledgerConfig CRUD
├── services/
│   ├── ledger.service.ts      # 导出调度与数据一致性
│   ├── ledger-data.service.ts # 数据源统一查询层
│   ├── ledger-excel.service.ts
│   ├── ledger-word.service.ts
│   ├── ledger-html-to-word.service.ts
│   └── ledger-style-presets.ts
├── components/
│   └── editors/
│       ├── DocxEditor.tsx       ← docx-editor 封装（新增）
│       └── XlsxEditor.tsx       ← Univer Sheets 封装（新增）
├── pages/
│   ├── editor/
│   │   ├── DocxEditorPage.tsx   ← Word 编辑器（新增）
│   │   └── XlsxEditorPage.tsx   ← Excel 编辑器（新增）
│   └── ledger-export/
│       ├── LedgerExportPage.tsx
│       ├── TemplateSelector.tsx
│       └── LedgerParamForm.tsx
└── utils/
    └── crypto.ts              # SHA-256 工具
```

### 10.6 验收标准

1. 在 TemplateLibraryPage 中上传 Excel/Word 模板时，可选择“复杂排版文档”或“标准流水台账”，并配置 `ledgerConfig`
2. 点击“导出标准台账”后，文件内容 100% 来自数据库实时查询，不允许写死任何示例数据
3. Excel 台账保留表头合并、边框、列宽、打印区域；关键枚举列具备数据校验下拉框
4. Word 台账通过 `docxtemplater` 表格循环实现，样式与模板一致
5. 导出文件页脚包含生成时间、项目名称、数据快照哈希
6. 导出后可选"下载到本地"或"打开编辑器"（docx-editor / Univer Sheets）
7. 每次导出生成 `generation_records` 记录，可通过 generationId 反查当时数据快照

---

## 十一、隐患状态机

```
[found 待整改] → 派单 → [assigned 已派单] → 责任人整改 → [rectifying 整改中]
                                                          ↓
                                                提交整改 → [submitted 待复查]
                                                          ↓
                                              复查 ──┬── pass → [closed 已闭环]
                                                    └── fail → [rectifying]（打回）

[found] 超过deadline → [overdue 超期]（红色）→ 整改后 → [rectifying]...→[closed]
重大隐患 → 标记isMajor → 可触发停工整改令生成
```

StatusFlow组件根据inspections.status展示步骤节点（shadcn的步骤组件或自绘），Timeline组件展示操作历史。

---

## 十二、AI与知识库技术方案（v3.0 可落地方案）

### 12.1 AI功能矩阵（MVP阶段）

| 功能 | 是否MVP | 实现方式 |
|------|--------|---------|
| AI导入项目信息 | ✅ MVP | DeepSeek Chat API（文本/PDF）+ DeepSeek Vision API（图片） |
| AI辅助方案写作（RAG） | ✅ MVP | 本地知识库检索 + DeepSeek Chat API 生成 |
| 知识库问答 | 🔜 二期 | RAG流式输出+来源标注 |
| 隐患分类建议 | 🔜 二期 | Chat API推荐 |
| 语音转文字 | 🔜 二期 | Web Speech API |
| 合规检查 | 🔜 三期 | RAG比对规范 |

### 12.2 AI服务配置

在「设置 → AI设置」中配置：
- API提供商：DeepSeek（默认）/ OpenAI兼容接口
- API Key：用户输入（加密存储在IndexedDB settings表）
- 模型：deepseek-chat（默认）/ deepseek-reasoner
- API地址：https://api.deepseek.com/v1（默认，可改）

前端直接调用DeepSeek API（从浏览器发起HTTPS请求），不需要本地后端。

### 12.3 AI导入项目信息

用户新建项目时，提供「📄 从文件导入」按钮：
1. 用户上传中标通知书PDF/图片/Word，或拖拽文件到上传区
2. 图片 → 调用DeepSeek Vision API识别图片中的文字和字段
3. PDF/Word → 先用pdf.js/mammoth提取纯文本 → 调用DeepSeek Chat API
4. Prompt要求：从文本中提取JSON格式的项目信息（项目名称、编号、地点、建设/施工/监理单位、项目经理、工期、合同金额等）
5. 返回JSON后自动填充到项目表单，用户核对修改后保存

Prompt设计（核心）：
```
你是建筑工程领域的助手。请从以下中标通知书/合同文本中提取项目信息，严格返回JSON：
{
  "name": "项目名称",
  "code": "项目编号（没有则留空）",
  "location": "工程地点",
  "owner": "建设单位",
  "contractor": "施工单位",
  "supervisor": "监理单位",
  "managerName": "项目经理",
  "techDirector": "技术负责人（如有）",
  "startDate": "开工日期YYYY-MM-DD（如有）",
  "endDate": "竣工日期YYYY-MM-DD（如有）",
  "contractAmount": "合同金额（如有）"
}
无法确定的字段留空字符串。只返回JSON，不要其他文字。
文本内容：
{{text}}
```

### 12.4 本地知识库RAG方案写作（v5.0 Glue Coding重构）

**场景**：用户写安全专项方案时，需要参考已有的规范、历史方案、标准范本，AI可以基于本地知识库帮助生成符合规范的方案文本。

#### 12.4.1 技术选型（Glue Coding原则：优先复用成熟方案）

v5.0 重构要点：**用成熟开源方案替换自研BM25/分词/切分，删除约450行自研代码，同时获得模糊搜索、自动建议等新能力。**

| 模块 | v4.x 自研方案 | v5.0 成熟方案 | 收益 |
|------|-------------|-------------|------|
| 全文检索 | 自研BM25 + 倒排索引（~300行） | **MiniSearch**（49.8k+项目依赖，MIT许可） | 原生BM25 + 前缀搜索 + 模糊匹配 + 自动建议 |
| 中文分词 | 双字滑窗 + 80词词典 | **@node-rs/jieba**（Rust结巴分词，1.5k stars） | 分词精度大幅提升，支持自定义词典 |
| 文本切分 | 自研chunker.service.ts | **@langchain/textsplitters**（RecursiveCharacterTextSplitter） | 递归智能切分，支持自定义分隔符 |
| AI调用 | 原始fetch + 手动流式解析 | **openai (OpenAI Node SDK)**（兼容DeepSeek） | 流式输出、自动重试、超时控制 |

**备选方案（fallback）：**
- 全文检索：如果知识库文档量 > 5000篇，升级为 **FlexSearch**（12k stars，CJK原生支持，IndexedDB持久化）
- 中文分词：如果NAPI-RS在Electron打包遇到问题，降级为 **jieba-wasm**（纯WASM实现）
- AI调用：如果OpenAI SDK版本不兼容，降级为当前的原生fetch方案
- 文本切分：如果包体积敏感，保留当前自研chunker

#### 12.4.2 知识库构建（v5.0）

1. 用户在「知识库」页面上传规范文档（.docx/.pdf/.txt/.md）
2. text-extractor.service解析：
   - docx：用PizZip解析XML提取文本
   - pdf：用pdf.js提取文本
   - txt/md：直接读取
3. **chunker.adapter.ts** 封装 LangChain RecursiveCharacterTextSplitter 切分：
   - 自定义分隔符：`["第.{1,6}条", "（[一二三四五六七八九十]+）", "\\d+\\.\\d+", "\\n\\n", "\\n", "。", "；"]`
   - 目标长度300-500字，最大600字，相邻切片重叠80字
   - 每个chunk保留：docId、docTitle、chunkIndex、content、tokens、category
4. 存入IndexedDB的knowledge_documents和knowledge_chunks表
5. **mini-search.adapter.ts** 为所有chunk建立MiniSearch索引：
   - 通过 `tokenize` 回调注入结巴分词（@node-rs/jieba），替代默认的Unicode空格分词
   - 配置 `searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 } }`
   - 索引保存在内存中（MiniSearch默认），启动时从IndexedDB重建

#### 12.4.3 MiniSearch检索引擎（替代自研bm25.service.ts）

```typescript
// mini-search.adapter.ts — 胶水适配层
import MiniSearch from 'minisearch'
import { load, cut } from '@node-rs/jieba'  // 或降级: import { cut } from 'jieba-wasm'

// 初始化结巴分词（加载自定义安全工程词典）
load() // 可传入自定义词典路径

const miniSearch = new MiniSearch({
  fields: ['content', 'title'],
  storeFields: ['docId', 'docTitle', 'chunkIndex', 'category'],
  searchOptions: {
    boost: { title: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
  // 注入结巴分词替代默认分词
  tokenize: (text: string) => cut(text, true) as string[],
  processTerm: (term: string) => term.toLowerCase(),
})

// 对外暴露与原bm25.service相同的接口签名
async function search(query: string, topK: number = 5): Promise<Chunk[]> {
  const results = miniSearch.search(query, { 
    // 可额外传入filter按category过滤
  })
  return results.slice(0, topK).map(r => ({
    docId: r.docId,
    docTitle: r.docTitle,
    chunkIndex: r.chunkIndex,
    content: r.content,
    category: r.category,
    score: r.score,  // MiniSearch内置BM25评分
  }))
}

// 自动建议（v5.0新增能力）
async function suggest(query: string): Promise<string[]> {
  return miniSearch.autoSuggest(query).map(s => s.suggestion)
}
```

**迁移策略：**
- 保留原 `bm25.service.ts` 作为 fallback（通过配置开关切换）
- 适配层 `mini-search.adapter.ts` 封装MiniSearch，对外暴露与 `bm25.service` 相同的接口签名
- 验证标准：Top-5检索结果重合率 ≥ 80%

#### 12.4.4 AI写作流程（v5.0 — OpenAI SDK升级）

```
用户输入写作需求（如："写深基坑专项方案"）
  ↓
rag-knowledge.service.retrieve(query, topK=5)
  ↓  调用 mini-search.adapter.ts.search()
MiniSearch BM25检索返回Top-5相关切片
  ↓
拼接Prompt：
  system: 你是建筑施工安全专家。请严格根据以下参考资料撰写方案。
          要求：专业、规范、符合建筑行业标准。必须引用参考资料编号。
  user: [参考资料1]《JGJ180-2009》4.2.3条：...
        [参考资料2]《危大工程管理规定》：...
        请撰写：{{query}}
  ↓
ai.service.ts 调用 OpenAI SDK（baseURL指向DeepSeek）
  const openai = new OpenAI({ 
    baseURL: 'https://api.deepseek.com',
    apiKey: userApiKey,
    dangerouslyAllowBrowser: true  // Electron环境需配置
  })
  const stream = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [...],
    temperature: 0.3,
    stream: true,
    max_tokens: 4096,
  })
  ↓
流式输出到UI，显示参考资料列表 + [参考资料X]引用标注
  ↓
用户可一键复制生成内容，或直接插入到文档编辑器中。
```

#### 12.4.5 幻觉控制策略
- 所有生成必须基于检索到的本地文档片段，Prompt中明确要求"仅根据参考资料回答，不要自己编造"
- 生成后显示参考资料来源（文档标题、条款/切片编号）
- 如果检索结果为空，提示用户"知识库中未找到相关内容，是否基于通用知识生成？"
- 用户可以在设置中调整temperature（0.1-1.0，默认0.3）

#### 12.4.6 性能保证
- 1000个切片以内检索 < 50ms（MiniSearch内存索引，预期性能优于自研BM25）
- 导入100页文档 < 5秒（提取+LangChain切分+结巴分词+MiniSearch索引）
- 删除文档时通过MiniSearch的 `remove()` 方法同步移除

### 12.5 涉及文件（v5.0 — Glue Coding重构后）

```
src/
├── services/
│   ├── ai.service.ts                ← OpenAI SDK封装（升级：替代原始fetch）
│   │                                  const openai = new OpenAI({ baseURL, apiKey })
│   ├── rag-knowledge.service.ts     ← RAG核心：导入/检索/删除/生成对话（不变）
│   ├── text-extractor.service.ts    ← docx/pdf/txt文本提取（不变）
│   ├── mini-search.adapter.ts       ← 【新增】MiniSearch适配层，封装索引/查询
│   │                                  （替代自研bm25.service.ts，删除~300行）
│   ├── chunker.adapter.ts           ← 【新增】LangChain TextSplitter适配层
│   │                                  （替代自研chunker.service.ts，删除~80行）
│   ├── tokenizer.adapter.ts         ← 【新增】结巴分词适配层，封装@node-rs/jieba
│   │                                  （替代自研双字滑窗分词，删除~70行）
│   ├── chunker.service.ts           ← 【保留为fallback】原始自研切分器
│   └── bm25.service.ts              ← 【保留为fallback】原始BM25引擎
├── pages/
│   ├── knowledge/
│   │   └── KnowledgePage.tsx        ← 知识库管理（不变）
│   ├── ai/
│   │   └── AiChatPage.tsx           ← AI助手（不变）
│   └── projects/
│       └── ProjectListPage.tsx      ← AI导入项目信息（不变）
├── components/business/
│   └── AiWritingPopover.tsx         ← AI写作输入/结果展示（不变）
└── db/repositories/
    ├── knowledge-doc.repo.ts        ← 知识库文档CRUD（不变）
    └── knowledge-chunk.repo.ts      ← 知识库切片CRUD（不变）
```

---

## 十三、移动端策略（三阶段）

- **Phase 0-8**：手机拍照→微信文件传输助手→电脑录入（零开发，符合现有习惯）
- **Phase 9**：Node.js Express本地服务（pkg打包exe）→ 局域网HTTP → 二维码 → 手机响应式H5（拍照/语音/整改/签到）
- **远期**：微信小程序/钉钉微应用，消息推送

移动端H5复用services/和repositories/，仅UI层用React适配手机屏幕（独立mobile/页面目录+Tailwind响应式）。

---

## 十三.5、v4.0 新增模块（劳保、机械设备、应急、事故、安全费用）

### 13.5.1 劳保用品（PPE Management）

**页面路径：** `/ppe` → `PpePage.tsx`

**数据模型（PpeItem）：**
```
name          → 用品名称
category      → 类别（安全帽/安全带/防护服/防护手套/防护鞋/其他）
specification → 规格型号
unit          → 单位（个/双/套）
quantity      → 库存数量
issuedQuantity→ 已发放数量
status        → 状态（充足/不足/已过期）
lastPurchaseDate → 最近采购日期
supplier      → 供应商
unitPrice     → 单价
remark        → 备注
```

**功能：** 入库登记、发放记录、库存查询、过期预警（状态标签绿/黄/红）

### 13.5.2 机械设备（Equipment Management）

**页面路径：** `/equipment` → `EquipmentPage.tsx`

**数据模型（Equipment）：**
```
name              → 设备名称
category          → 类别（起重机械/土方机械/混凝土机械/运输机械/其他）
model             → 型号
serialNumber      → 出厂编号
ownerUnit         → 所属单位
entryDate/exitDate → 进场/退场日期
inspectionDate/nextInspectionDate → 检验日期
status            → 状态（在用/停用/已退场/待检验）
```

**功能：** 设备登记、进场/退场记录、检验到期提醒

### 13.5.3 应急管理（Emergency Management）

**页面路径：** `/emergency` → `EmergencyPage.tsx`（三栏 Tab 切换）

**三个子模块：**
- **应急预案（EmergencyPlan）：** name, category, applicableScope, version, issueDate, content
- **应急物资（EmergencySupply）：** name, category, quantity, unit, storageLocation, expiryDate, status（正常/即将过期/已过期/短缺）
- **演练记录（EmergencyDrill）：** title, drillType, date, location, organizer, participantCount, evaluation

**功能：** 预案管理、物资盘点、演练记录、过期预警

### 13.5.4 事故管理（Accident Management）

**页面路径：** `/accidents` → `AccidentPage.tsx`

**数据模型（AccidentRecord）：**
```
title              → 事故标题
accidentType       → 事故类型（高处坠落/物体打击/机械伤害/触电/坍塌/火灾/中毒/其他）
severity           → 严重程度（轻伤/重伤/死亡/未遂）
occurrenceDate     → 发生日期
occurrenceLocation → 发生地点
victimName         → 受害人姓名
description        → 事故经过
cause              → 原因分析
treatment          → 处理措施
correctiveActions  → 整改措施
status             → 状态（调查中/已结案/已上报）
```

**功能：** 事故上报、原因分析、整改跟踪、统计卡片（事故总数/未遂事件/工伤记录/已结案）

### 13.5.5 安全费用（Safety Cost Management）

**页面路径：** `/safety-cost` → `SafetyCostPage.tsx`

**数据模型（SafetyCost）：**
```
date      → 日期
category  → 费用类别（劳保用品/安全设施/培训教育/应急物资/其他）
amount    → 金额
handler   → 经办人
remark    → 备注
```

**功能：** 费用登记、预算概览、统计分析（年度预算/已支出/执行率/剩余预算）

### 13.5.6 数据库表

新增 6 个 Dexie 表（version 6）：
```
ppeItems, equipment, emergencyPlans, emergencySupplies, emergencyDrills, accidentRecords, safetyCosts
```

### 13.5.7 交互设计原则（v4.0 全桌面交互标准）

由于软件从 360px WPS 任务窗格变为全桌面应用，所有页面遵循以下交互标准：

1. **标题 + 操作栏：** 每页顶部有清晰的标题（中文）、副标题说明、操作按钮（teal 主色）
2. **搜索前置：** 搜索框始终在表格上方，支持实时过滤
3. **内联表单：** 新增/编辑不使用弹窗，而是展开一个内联表单区域，填写后立即插入列表
4. **状态标签：** 所有状态用彩色小标签显示（绿=正常、黄=警告、红=危险）
5. **空状态引导：** 无数据时显示图标 + 引导文字 + 操作按钮
6. **统计卡片：** 有统计需求的页面（事故、费用）在表格上方展示 KPI 卡片
7. **表格列：** 关键字段 + 状态 + 操作（编辑/删除）
8. **小白友好：** 不使用英文术语、不使用 `{{}}` 语法、所有文案用中文、placeholder 示例化

---

## 十四、Electron IPC 通信层

独立桌面应用通过 Electron 的 contextBridge 安全暴露 API 给渲染进程。所有原生操作（文件对话框、窗口控制、系统通知等）通过 IPC 通信。

### 14.1 preload.ts 暴露的 API

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  saveFile: (path: string, data: ArrayBuffer) => ipcRenderer.invoke('file:save', path, data),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // 系统集成
  showNotification: (title: string, body: string) => ipcRenderer.send('notification:show', title, body),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,
})
```

### 14.2 渲染进程使用

通过 `useElectron()` hook 封装（新增 `src/hooks/useElectron.ts`）：

```typescript
// hooks/useElectron.ts
export function useElectron() {
  const api = (window as any).electronAPI
  return {
    isElectron: !!api,
    openFile: api?.showOpenDialog,
    saveFile: api?.showSaveDialog,
    // ...
  }
}
```

### 14.3 与旧 WPS bridge 的差异

| 旧（wps-bridge） | 新（Electron IPC） |
|------------------|-------------------|
| WPS 专有 API | 标准 Electron API |
| 需要 WPS 运行环境 | 独立运行，不依赖任何软件 |
| openDocument(base64) | 打开文件对话框 + 编辑器渲染 |
| 仅 WPS 内可用 | 跨平台（Windows/macOS/Linux） |

---

## 十五、分阶段开发计划（MVP优先，渐进发布）

**核心策略**：先做最小可用产品（MVP）让用户能用起来，再迭代高频功能，最后补齐完整闭环。未完成功能通过feature flag隐藏入口，保留代码不删除。

**v4.0 重构**：在现有完成代码基础上，进行 Electron 迁移 + UI 全面重构 + 文档编辑器集成。业务逻辑层（services/db/store/types）不动。

每个Phase完成后必须：
1. `npx tsc --noEmit` 类型检查通过
2. `npm run build` 构建通过
3. 浏览器打开控制台无红色error
4. 调用webapp-testing验证核心流程

---

### Phase 0：Electron 迁移 + UI 重构（当前）⏳ 进行中

**目标**：将现有 React 应用从 WPS 加载项改造为独立 Electron 桌面应用，重新设计全部 UI，集成文档编辑器。

| 子阶段 | 内容 |
|--------|------|
| 0.1 Electron 壳 | 创建 electron/main.ts + preload.ts，集成 Vite dev server，确认现有 React 在 Electron 中正常运行 |
| 0.2 UI 重构 | 实现新 Sidebar（240px 深色，27 模块 7 组）、新 Header（面包屑+项目切换）、新 AppLayout（全桌面布局）、重写所有页面样式 |
| 0.3 编辑器集成 | 安装 docx-editor + Univer Sheets，创建 /editor/docx 和 /editor/xlsx 页面，模板库/知识库中文件点击→打开编辑器 |
| 0.4 打包 | electron-builder 配置，测试打包 exe，安装程序测试 |

**验收标准**：
1. 双击 exe 启动，看到完整桌面窗口（1280x800）
2. 深色侧边栏展示所有 27 个模块（7 组），点击切换正常
3. 模板库中点击 .docx → 软件内打开 docx-editor 编辑
4. 台账导出 .xlsx → 软件内打开 Univer Sheets 编辑
5. 所有 27 个模块功能正常（业务逻辑不变）
6. 生成单 exe 安装包，安装到其他电脑测试通过

---

### MVP第一期：文档生成核心 ✅ 已完成
**目标**：扫描导入模板 → 建项目（支持AI导入）→ 一键/批量生成Word文档，核心功能能出活。
**当前状态**：全部完成，28 模块 Playwright 自动化测试验证通过。

| 模块 | 状态 | 内容 |
|------|------|------|
| 功能开关 | ✅ | `src/config/features.ts`集中管理，所有已开发模块默认开启 |
| 工作台 | ✅ | HomePage：当前项目、快捷入口、最近生成、待处理 |
| 侧边栏导航 | ✅ | 240px 深色侧边栏，27 模块 7 组（v4.0 已实现） |
| 项目管理 | ✅ | ProjectListPage：固定字段+扩展字段+「AI导入」按钮 |
| AI导入项目 | ✅ | 上传PDF/图片/Word→DeepSeek Vision/Chat API提取JSON→填充表单 |
| AI设置 | ✅ | SettingsPage：API Key、模型、地址、连接测试 |
| 全局变量库 | ✅ | VariableSettingsPage：内置变量+自定义变量+编制人设置 |
| 模板库 | ✅ | TemplateLibraryPage：左右分栏、根分类树、子分类浮层、复选框批量选择 |
| 批量生成 | ✅ | 选中多个模板→JSZip打包→自动下载ZIP→结果面板 |
| 分类体系 | ✅ | 初始化清空，所有分类可删改，级联删除 |
| 文件夹导入向导 | ✅ | 四步流程：选文件夹→两阶段进度条→文件夹树预览→完成统计 |
| 单文件导入 | ✅ | 导入后自动提取变量、自动匹配全局变量库 |
| 文档生成 | ✅ | generate.service按GlobalVariable.sourceType取值；manualInput弹窗补填 |
| 知识库RAG | ✅ | v5.0重构：MiniSearch+结巴分词+LangChain切分+OpenAI SDK（替代自研BM25/分词/chunker） |
| AI写作 | ✅ | AiChatPage：RAG问答、流式输出、知识库引用 |
| 数据备份 | ✅ | SettingsPage备份/恢复功能 |

**MVP验收标准**（全部通过）：
1. ✅ 打开软件，侧边栏展示所有模块，点击切换正常
2. ✅ 工作台显示当前项目、最近生成、快捷入口
3. ✅ 新建项目：能手动填字段；上传中标通知书图片/PDF后AI自动识别填充
4. ✅ 设置里配置DeepSeek API Key（sk-xxx），测试连接成功
5. ✅ 扫描本地模板文件夹，进度条正常走动不卡死，左侧只显示根分类
6. ✅ 导入带`{{项目名称}}{{项目经理}}{{开工日期}}`的docx模板，变量自动匹配
7. ✅ 选中多个模板点"批量生成"，成功下载ZIP，结果面板显示成功/跳过/失败
8. ✅ 知识库上传安全规范PDF，AI助手能基于规范生成方案并标注来源
9. ✅ `npm run build` 0 TypeScript错误，浏览器控制台0 error

---

### 第二期：高频台账提效 ✅ 已完成
**目标**：日常最高频的安全文档，数据录一次自动出表。
**当前状态**：全部完成，Playwright 自动化测试验证通过。

| 模块 | 内容 |
|------|------|
| 开关开启 | 全部已开启（hazardManagement/workerManagement/educationManagement/dailyLog/subcontractorManagement/meeting） |
| 人员管理 | 工人花名册CRUD、Excel导入、证件管理、证书到期预警 |
| 安全教育 | 三级教育录入、教育记录/教育卡Word生成 |
| 分包管理 | 分包单位CRUD、资质管理 |
| 安全日志 | 日志CRUD（施工内容、安全措施落实情况、记录人）、日志文档生成 |
| 安全会议 | 会议记录、签到表生成 |
| 隐患排查 | 隐患录入（含拍照）、整改/复查流程、超期预警 |

**验收**：全部通过。录入工人后能批量生成三级教育记录卡；安全日志从录入到生成文档一键完成。

---

### 第三期：完整安全管理闭环 ✅ 已完成
**目标**：补齐隐患排查、危险作业、验收、应急、看板等完整业务闭环。
**当前状态**：全部完成，Playwright 自动化测试验证通过。

| 模块 | 内容 |
|------|------|
| 危险源辨识 | 危险源清单、LEC法评估、辨识记录文档 |
| 危大工程 | 危大工程清单、专项方案、巡查记录 |
| 危险作业许可 | 动火/高处/有限空间/临时用电/起重/开挖/爆破作业许可证生成审批 |
| 安全验收 | 脚手架/模板/临时用电等验收单生成 |
| 培训管理 | 培训记录管理 |
| 收发文 | 通知函件登记、文件模板生成 |
| 看板统计 | Dashboard：隐患统计、整改率、教育覆盖率等图表 |
| 报表中心 | 周报/月报自动聚合生成 |

**未开发模块**（远期规划，无页面文件）：
- 劳保用品（ppeManagement）
- 机械设备（equipmentManagement）
- 应急管理（emergencyManagement）
- 事故管理（accidentManagement）

---

### 第四期：AI深度增强
- 知识库问答（流式对话+来源标注）
- 隐患描述AI润色+分类建议
- 方案大纲生成→逐章流式写作→插入Word
- 合规性检查（文档 vs 规范对比）
- Embedding API接入做向量检索升级（可选）
- 表单自定义（用户自由加字段）

---

### 远期（可选）：本地服务+移动端
- Node.js Express本地服务（pkg打包exe）
- SQLite后端
- 手机扫码H5录入（拍照/语音/整改/签到）
- 局域网多端同步

---

## 十六、无Git环境安全开发守则

1. **Phase开始前备份**：
   ```powershell
   $ts = Get-Date -Format "yyyyMMdd_HHmmss"
   Copy-Item -Path "src" -Destination "backup\src_phase${phaseNum}_start_$ts" -Recurse -Force
   ```

2. **Phase完成后备份**：
   ```powershell
   Copy-Item -Path "src" -Destination "backup\src_phase${phaseNum}_done" -Recurse -Force
   ```

3. **AI操作纪律**：
   - 一次最多创建/修改2个文件
   - 改完一个文件，npx tsc --noEmit检查类型错误，再改下一个
   - 核心文件（db/index.ts/vite.config.ts/tailwind.config.ts）改前先.bak

4. **验证流程**：
   - npm run dev 正常启动
   - 浏览器控制台无红色error
   - **调用webapp-testing技能自动测试关键流程**
   - 功能操作走通（数据能保存、点击有反应）

5. **回滚方案**：单文件.bak恢复；模块用backup完整备份覆盖；全崩用上Phase done备份

6. **TypeScript严格模式**：tsconfig.json开启strict:true，不允许any（必要时显式as并注释原因）

---

## 十七、数据校验规则

### 17.1 格式校验（zod + 自定义validate）

| 字段 | 规则 |
|------|------|
| 必填 | z.min(1) 或 required_error |
| 身份证 | z.string().regex(/^\d{17}[\dXx]$/) + 校验位验证（utils/id-card.ts） |
| 手机号 | z.string().regex(/^1[3-9]\d{9}$/) |
| 信用代码 | z.string().regex(/^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/) |
| 日期 | z.string().regex(/^\d{4}-\d{2}-\d{2}$/) |
| 金额 | z.number().min(0) |
| 文件大小 | photo<=5MB，pdf/docx<=20MB（compress.ts压缩） |

### 17.2 业务校验（Service层）

- 退场工人检查：未闭环隐患/未完成教育→阻止退场并提示
- 分包退场：未整改/未缴罚款/证件未到期→警告
- 隐患deadline不能早于foundDate
- 有限空间作业必须有气体检测记录
- 同一项目同一岗位同一时段不重复人员

校验失败抛出ServiceError(code, message)，UI层通过toast显示message。

---

## 十八、错误处理与日志

### 18.1 错误分层

- **UI层**：try-catch，toast.error(message)，不吞错误
- **Service层**：throw new ServiceError(code, message, cause)
- **Repo层**：throw new DbError(operation, cause)
- **全局**：App.tsx注册window.onerror + unhandledrejection，记录到localStorage，用户看到友好提示

### 18.2 错误码

E1xxx项目/通用，E2xxx人员/教育，E3xxx隐患/检查，E4xxx模板/生成，E5xxxAI/知识库，E6xxx导入导出，E7xxx移动端/同步，E9xxx系统/未知。

### 18.3 日志

- **操作日志**（operation_logs表）：audit.service订阅event-bus的所有写事件（*:created/*:updated/*:deleted）自动记录（含before/after快照）
- **开发者日志**：开发环境console.log/warn/error，生产环境由全局错误处理器记录
- **性能日志**：批量生成每份文档耗时，>2s标记warn

---

## 十九、数据备份恢复

### 19.1 自动备份
- 启动时距上次备份>7天→提示备份
- 批量生成前→自动备份当前项目
- DB迁移前→自动全量JSON备份

### 19.2 手动备份
- 全量/单项目/模板/知识库四种备份粒度
- 导出JSON（Blob→Base64，ZIP压缩）
- 恢复时选文件→校验→二次确认→覆盖
- Blob字段导出时转Base64，导入时转回Blob

### 19.3 IndexedDB配额
- 照片压缩：最长边1280px，质量0.8（单张约200KB）
- 设置页显示已用/预估可用
- 超过80%提醒清理或备份

---

---

## 二十一、工程配置

### 21.1 package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "typecheck": "tsc --noEmit",
    "electron:dev": "concurrently \"vite\" \"electron .\"",
    "electron:build": "vite build && electron-builder",
    "electron:start": "electron ."
  }
}
```

### 21.2 vite.config.ts关键配置

```ts
export default defineConfig({
  base: './',
  server: { port: 8080, open: true },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          dexie: ['dexie', 'dexie-react-hooks'],
          docx: ['docxtemplater', 'pizzip'],
          charts: ['chart.js', 'react-chartjs-2'],
          shadcn: Object.keys(shadcnDependencies),
        }
      }
    }
  }
})
```

### 21.3 tsconfig.json关键配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }  // 别名
  }
}
```

使用 `@/components/xxx` `@/utils/xxx` 路径别名避免相对路径地狱。

---

## 二十二、关键交互细节

### 22.1 照片上传（FileUploader+PhotoGrid）
- 支持点击/拖拽/Ctrl+V粘贴
- 批量最多9张，选择后canvas压缩（最长边1280px，质量0.8）
- 上传前预览，可删除、旋转、加备注
- 存IndexedDB Blob

### 22.2 自动保存（useAutoSave hook）
- 长表单（日志/隐患/培训）每30秒保存到localStorage
- 表单key由"formType_projectId_recordId"组成
- 重新打开检测草稿→提示恢复
- 正式提交后清除草稿

### 22.3 快捷键（useKeyboard hook）
- Ctrl+K 全局搜索
- Ctrl+S 表单保存
- Esc 关闭弹窗/Sidebar
- Ctrl+N 列表页新增

### 22.4 列表页统一模式
所有列表页统一：
1. PageHeader（标题+新增按钮+搜索框）
2. 可折叠筛选区（状态/日期/分包/类型）
3. DataTable（列表视图，1400px 宽屏下默认表格，窄屏自动切换卡片）
4. 批量操作栏（勾选后出现，批量删除/导出/改状态，需AlertDialog确认）
5. Pagination分页（每页20条）
6. EmptyState空状态（图标+文案+"立即创建"按钮）
7. Loading时显示Skeleton骨架屏

### 22.5 通知中心
- Header铃铛图标+未读红点（sonner或badge）
- 点击弹出Sheet或跳转NotificationCenterPage
- 通知项：类型图标+标题+时间+点击跳转处理
- 支持已读/全部已读/删除
- 提醒来源：证件到期（≤30天）、隐患超期、分包许可证到期、待整改/待复查、周五下午提醒周报、演练到期

---

## 二十三、扩展性架构设计

### 23.1 BaseRepository<T>泛型基类

所有Repo继承BaseRepository<T>，统一提供：
- getById/add/update/delete/bulkAdd/count
- paginate({page, pageSize, filter, sortBy, sortDir})
- getAllByProject(projectId)
- 自动设置createdAt/updatedAt
- add/update/delete后通过event-bus emit对应事件（如'inspection:created'），供audit.service和reminder.service订阅

Phase 9切换SQLite/HTTP时，只需新增SQLiteRepository/HttpRepository继承BaseRepository覆盖方法，**service和UI层零修改**。

### 23.2 Event Bus（mitt）

全局事件总线用于模块解耦：
- 'project:switched' → 所有页面刷新
- 'inspection:closed' → 通知标记已处理
- 'inspection:overdue' → 创建reminder
- 'worker:exiting' → 检查未闭环事项
- '*'通配符 → audit.service记录所有写操作

### 23.3 模块注册

新增业务模块（质量/进度/成本）时：
1. migrations加新版本定义新表
2. 新建repo（extends BaseRepository）
3. 新建service
4. pages下建列表/表单页（调用frontend-design生成）
5. config/forms加schema+uiSchema
6. config/menu.tsx加导航项
7. 如需看板/报表/通知，注册对应回调
8. **不需要改App.tsx/router/core/已有代码**（路由用menu.tsx驱动自动注册）

### 23.4 后端化预留

- 所有Repo方法返回Promise，风格与HTTP API一致
- sync_queue表预留，写操作可双写
- HttpRepository切换后service零修改
- 增量同步基于sync_queue+lastSyncTime+updatedAt

---

## 二十四、打包发布（Electron）

### 24.1 开发模式
`npm run electron:dev` → 启动 Vite dev server + Electron 窗口，支持热更新。

### 24.2 生产打包
`npm run electron:build` → Vite 构建 React 应用 → electron-builder 打包为单 exe 安装程序。

electron-builder 配置（package.json）：
```json
{
  "main": "electron/main.js",
  "build": {
    "appId": "com.liuge.safety-platform",
    "productName": "溜哥的安全管理平台",
    "directories": { "output": "release" },
    "win": {
      "target": "nsis",
      "icon": "public/assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ]
  }
}
```

### 24.3 安装包交付
- 输出：`release/溜哥的安全管理平台 Setup x.x.x.exe`
- 双击安装 → 选择目录 → 创建桌面快捷方式 → 完成
- 安装后独立运行，不依赖 WPS / Office / 任何第三方软件
- 预期体积：150-200MB（含 Chromium 内核）

### 24.4 Phase 2 联网版
本地 Node 服务 + SQLite + 数据同步 API，预留。

---

## 二十五、最终交付检查清单

- [ ] 所有Phase验收通过
- [ ] npm run build 0 TypeScript错误
- [ ] 浏览器控制台0 error
- [ ] Electron 窗口正常启动，无崩溃
- [ ] 空数据场景EmptyState友好
- [ ] 所有表单zod校验正确
- [ ] 批量生成100份文档不崩溃不丢失
- [ ] 备份导出/导入数据完整
- [ ] 数据库升级不丢失数据
- [ ] 操作日志记录完整
- [ ] 通知提醒正确触发
- [ ] 照片上传/压缩/预览正常
- [ ] AI配置保存/连接测试正常
- [ ] 知识库导入/检索/问答准确
- [ ] docx-editor 打开/编辑/保存 .docx 正常
- [ ] Univer Sheets 打开/编辑/保存 .xlsx 正常
- [ ] 单 exe 安装包安装/卸载正常
- [ ] 预置30+模板可用
- [ ] 预置A1-A15分类完整
- [ ] 看板统计数据正确
- [ ] 周报月报聚合准确
- [ ] 标准合规台账导出内容与数据库实时一致、页脚含快照哈希
- [ ] **webapp-testing自动测试关键流程通过**
- [ ] 备份脚本可用

---

## 二十六、给AI开发助手的指令规范（新开窗口必读）

新窗口AI必须遵守：

### 26.1 【第一步】必须先读规范
开始任何工作前，先用Read工具**完整阅读**本PROJECT_SPEC.md（不要跳过）。理解技术栈、目录结构、分层规则、Phase计划。

### 26.2 【第二步】优先调用Trae技能
- 创建/修改UI页面或组件时，**必须调用`frontend-design`技能**，告诉它"全桌面安全管理系统页面，深色侧边栏240px，工业安全专业风，teal主色#0F766E，shadcn/ui组件，Tailwind CSS"，按它的代码为基础融入业务逻辑
- 复杂多组件页面调用`web-artifacts-builder`
- 从零创建新模块页面调用`web-dev`
- **每个Phase验收时调用`webapp-testing`**，启动dev server，让浏览器自动跑一遍关键流程，截图验证

### 26.3 【第三步】引导式开发
- 每个Phase开始前先用通俗中文告诉我：做什么、做完我能看到什么效果
- 列出要创建/修改的文件清单+每个文件用途（200字以内），问"确认开始吗？"
- 等我回复"确认"再动手
- 一次最多创建/修改2个文件
- 写完一个文件说一声，再写下一个
- 遇到技术选择给2-3个选项+推荐，让我选

### 26.4 【技术铁律】
- 必须用React 18函数组件+Hooks，**禁止类组件**
- 必须用TypeScript，**禁止any**（必要时as并注释）
- 必须用Tailwind CSS类名，**禁止写自定义CSS**（除了index.css的全局样式和CSS变量）
- UI组件优先用shadcn/ui，**禁止自己造Button/Input/Modal等基础组件**
- 表单用react-hook-form+zod，**禁止手动维护表单状态**
- 全局状态用Zustand，局部状态用useState
- 数据查询用dexie-react-hooks的useLiveQuery，**禁止在useEffect里手动fetch再setState**（除异步操作）
- 组件**禁止直接import repositories**，必须通过services层
- Service**禁止操作DOM和React APIs**
- 单文件不超过200行（shadcn生成的组件除外）

### 26.5 【验证铁律】
- 每写完一个文件：npx tsc --noEmit检查类型错误（如果配置了typecheck）
- 每写完几个相关文件：npm run dev能正常启动
- 每个Phase完成：提醒我运行PowerShell备份命令
- 每个Phase验收：**调用webapp-testing技能自动测试**
- 不自动推进，Phase完成后等我说"开始Phase X"再继续
- 遇到错误立即停下分析，不跳过

### 26.6 【沟通风格】
- 说人话，少用技术术语
- 每完成一个文件：告诉我"已创建XX文件，作用是XXX"
- 遇到歧义：问我，不要猜
- 如果发现规范有问题或更好的方案：提出来让我决定

---

## 二十七、踩坑记录（前人血泪，后人必读）

> 本节记录了从 v1.0 WPS 加载项到 v4.0 独立桌面应用开发过程中遇到的所有重大问题和解决方案。
> **任何开发者在做以下决策时必须先读本节，避免重蹈覆辙。**

### 27.1 WPS 加载项路线失败记录

| 问题 | 现象 | 根因 | 最终方案 |
|------|------|------|---------|
| WPS 个人版插件不显示 | jsplugins.xml 配置正确，但 WPS 不加载插件 | WPS 个人版 12.1.0.16910+ 官方封堵了 oem.ini + jsplugins.xml 加载方式 | 放弃 WPS 加载项路线，转向独立 Electron 桌面应用 |
| oem.ini 仅限专业版 | oem.ini 方式在隔壁项目可用，本机不行 | oem.ini 仅适用于 WPS 专业版/企业版，不适用于个人版 | 确认本机为个人版，不再尝试 oem.ini |
| publish.html 需浏览器 | 离线 publish.html 需要用户手动点击浏览器确认 | WPS 官方替代方案，但安装流程不优雅（非一键 exe） | 不采用，用户体验差 |
| wpscloudsvr.exe 依赖 | 离线 publish 需要本地 WPS 云服务端口 58890 | 个人版 WPS 内置服务，但稳定性差 | 不采用 |

**教训：不要依赖任何第三方办公软件的版本和加载机制。独立 exe 是唯一可靠的交付方式。**

### 27.2 技术选型踩坑

| 问题 | 现象 | 根因 | 最终方案 |
|------|------|------|---------|
| Univer Docs 是商业版 | 以为 Univer 可以同时做 Word 和 Excel 编辑 | Univer 的 Docs 导入导出（docx）是 Pro 商业版，只有 Sheets 是 Apache 2.0 开源 | Word 用 docx-editor，Excel 用 Univer Sheets，两者分开 |
| docx-editor 不支持 .doc | 导入 .doc 文件失败 | docx-editor 仅支持 OOXML 格式（.docx），不支持旧版 .doc 二进制格式 | .doc 文件需先用 LibreOffice 命令行转 .docx |
| OnlyOffice 需后端 | 想用 OnlyOffice 做编辑器 | OnlyOffice 需要 Document Server 后端服务，AGPL 许可证 | 不采用，太重 |
| LibreOffice 不可嵌入 | 想嵌入 LibreOffice 做编辑器 | LibreOffice 是独立桌面软件，不是可嵌入的 JS 组件 | 不采用 |
| koa-connect 导致 ctx 泄漏 | 本地测试服务器内存泄漏 | koa-connect 包装器在 Koa 中不稳定 | 改用原生 Koa 中间件 |

### 27.3 模板与文档处理踩坑

| 问题 | 现象 | 根因 | 解决方案 |
|------|------|------|---------|
| docxtemplater 变量解析失败 | 模板中的 `{{变量名}}` 无法识别 | Word XML 将文本节点（`<w:t>`）拆分为多个片段，变量名被截断 | 在解析前合并相邻 `<w:t>` 节点 |
| 测试模板变量分离 | 手工创建的测试模板无法被 docxtemplater 识别 | 变量必须在独立的 `<w:r>` 元素中 | 使用 docxtemplater 兼容的模板结构 |
| .doc 文件导入失败 | 用户导入 .doc 文件时报错 | .doc 是二进制格式，mammoth 只支持 .docx | 模板扫描时自动分类：.docx→模板库，.doc→提示导入失败 |
| 模板扫描不显示文件夹 | 模板扫描后文件夹层级丢失 | 没有保留原始文件夹结构 | 模板分类保留原始文件夹层级 |
| 模板扫描后列表不刷新 | 导入后页面无变化 | 组件内状态未触发全局刷新 | 导入完成后自动刷新分类树 |

### 27.4 前端开发踩坑

| 问题 | 现象 | 根因 | 解决方案 |
|------|------|------|---------|
| 页面切换丢失状态 | 切换到其他 Tab 再切回来，扫描进度丢失 | 扫描进度存组件内 useState，切换页面时组件卸载 | 跨页面状态必须存 Zustand 全局 store |
| React 受控输入保存失败 | Playwright 测试中输入值后保存按钮不可点击 | React 受控组件需要状态同步，直接 DOM 操作不触发 onChange | 使用临时 ID + Playwright `fill` 方法确保状态同步 |
| 测试脚本硬编码端口 | 不同环境端口冲突 | 测试脚本中写死了端口号 | 使用命令行参数或环境变量 |
| 测试数据清理依赖 UI | 测试后数据清理失败 | 通过 UI 点击序列删除数据，依赖不稳定 | 测试清理直接调用 IndexedDB repository 接口 |

### 27.5 工程规范踩坑

| 问题 | 教训 | 规范 |
|------|------|------|
| AI 独立创建新文件而非修改现有文件 | 方案被独立写成 REDESIGN_PLAN.md 而非更新 PROJECT_SPEC.md，导致信息分散 | **所有方案修改必须直接在 PROJECT_SPEC.md 中完成，不创建独立的方案文件** |
| 多文件同步修改不完整 | 删除 wps-bridge.ts 后，引用它的 LedgerTestCard.tsx 和 TemplateLibraryPage.tsx 未同步更新 | **删除/重命名文件时，必须搜索所有引用并同步更新** |
| 数据库名变更不通知用户 | 从 zhian_ledger 改为 liuge_safety，旧数据无法自动迁移 | **数据库名变更必须在设置页提供"从旧版导入数据"功能** |
| 调试脚本残留 | scripts/ 目录下 40+ 个 .py/.cjs 调试脚本未清理 | **每个 Phase 完成后清理调试脚本和临时文件** |

### 27.6 当前已知限制

1. **docx-editor 不支持 .doc 格式**：需用 LibreOffice 命令行转 .docx（Phase 1 实现）
2. **Univer Docs 导入导出是商业版**：不用它做 Word 编辑，只做 Excel
3. **离线使用**：数据存本地 IndexedDB，不支持多设备同步（Phase 2 联网版解决）
4. **知识库 RAG 需要网络**：DeepSeek API 调用需要网络，离线不可用
5. **AI 浮窗不可用**：原 WPS 文档内选中浮窗功能（AI写/找规范/替换）在独立应用中不可用，需重新设计交互方式

---

## 二十八、变更记录（Changelog）

### v5.0.0 — 2026-07-11 Glue Coding 架构重构：自研替代与开源组件升级

**触发原因：** 基于「拼好码（Glue Coding）」工程方法论审查，识别出 4 个自研模块可替换为成熟开源方案，删除约 450 行自研代码。

**改造内容：**

- 全文检索：MiniSearch 替代自研 BM25 引擎
  - 新增 `mini-search.adapter.ts` 适配层，封装 MiniSearch 索引/查询
  - 保留 `bm25.service.ts` 作为 fallback（配置开关切换）
  - 收益：删除 ~300 行自研代码，获得模糊搜索、前缀搜索、自动建议
- AI 调用：OpenAI Node SDK 替代原始 fetch
  - `ai.service.ts` 升级为 `openai` npm 包（baseURL 指向 DeepSeek）
  - 收益：内置流式输出、自动重试、超时控制
  - 降级方案：保留原始 fetch 作为 fallback
- 文本切分：LangChain TextSplitter 替代自研 chunker
  - 新增 `chunker.adapter.ts` 适配层，封装 RecursiveCharacterTextSplitter
  - 保留 `chunker.service.ts` 作为 fallback
  - 收益：删除 ~80 行自研代码，递归智能切分
- 中文分词：@node-rs/jieba 结巴分词替代双字滑窗
  - 新增 `tokenizer.adapter.ts` 适配层
  - 分词精度大幅提升，支持自定义安全工程词典
  - 降级方案：jieba-wasm（纯 WASM 实现）
- 新增 〇.3 节：Glue Coding（拼好码）工程规范
- 更新 12.4 节：知识库 RAG 模块完整技术方案（含代码示例）
- 更新 12.5 节：涉及文件清单（新增适配层、保留 fallback）

**验证标准：** `npx tsc --noEmit` 零错误，`npx vite build` 通过；Top-5 检索结果重合率 ≥ 80%。

### v4.0.7 — 2026-07-09 人员证件备案、模板库与变量系统优化

**触发原因：** 用户提出 5 项整改需求：人员证件备案+过期提醒、变量结构清晰化、模板库 UI 大气化、模板点击即编辑、中文变量名支持。

**改造内容：**

- 模板库 UI 大气化与交互优化：
  - `src/pages/templates/TemplateLibraryPage.tsx`：移除分类树折叠逻辑，aside 固定宽度 `w-56`。
  - `src/components/business/CategoryTree.tsx`：删除折叠模式；分类操作按钮（编辑/删除）始终可见；图标、字号、间距整体加大。
  - `src/pages/templates/components/TemplateCard.tsx`：卡片整体可点击打开变量映射编辑；操作按钮加大间距；删除按钮直接外露，取消「更多」下拉菜单。
- 中文变量名支持：
  - `src/services/variable-settings.service.ts`：内置变量 `id` 与 `label` 统一为中文（如 `项目名称`、`施工单位`），不影响数据库字段映射。
  - `src/services/template-import.service.ts`：`inferMapping` 适配中文变量名；`extraFieldKey` 映射来源自动切换为 `extraField`。
  - `src/services/generate.service.ts`：兼容旧数据中 `source='field'` 但带 `extraFieldKey` 的扩展字段映射。
- 变量结构清晰化：
  - `src/components/business/VariableMappingEditor.tsx`：重构为分组卡片式布局；字段下拉按「项目基础信息 / 参建单位 / 项目人员 / 扩展字段」分组并中文显示；增加变量搜索框；未映射变量高亮并置顶提示。
- 人员证件备案与过期提醒：
  - `src/pages/workers/components/WorkerFormSheet.tsx`：新增「证件备案」区块，支持录入多本证件（类型、证号、发证机关、发证日期、有效期、图片/PDF 附件）。
  - `src/pages/workers/components/WorkerDetailSheet.tsx`：新增证件列表，按状态（正常 / 即将过期 / 已过期）标色，支持查看附件。
  - `src/services/workerService.ts`：新增 `saveCertificates(workerId, certificates)` 批量覆盖保存。
  - `src/pages/home/HomePage.tsx`：待处理区域扫描在岗人员证件，将已过期和 30 天内过期证件聚合显示并支持跳转。

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 16.12s 通过；Playwright 截图验证模板库、人员管理、首页、变量设置页面布局正常（截图：templates_phase4.png、workers_phase4.png、home_phase4.png、variable_settings_phase4.png）。

### v4.0.6 — 2026-07-09 Phase 2 项目管理页面 UI/UX 重构

**改造内容：**

- 重写 `src/pages/projects/ProjectListPage.tsx` 为薄页面（56 行），从 647 行压缩，拆分出：
  - `useProjectList.ts`：基于 `useLiveQuery` 自动同步项目列表，输出筛选后列表、5 项统计（全部/施工中/待开工/已停工/已竣工）。
  - `ProjectToolbar.tsx`：标题+数量 / 搜索框 / 新建按钮，移除浮球按钮。
  - `ProjectCard.tsx`：项目信息卡片，当前项目高亮显示「当前项目」标签，非当前项目显示「切换到此项目」快捷按钮。
  - `ProjectList.tsx`：4 个水平统计卡片 + 列表 + 空状态。
  - `ProjectFormSheet.tsx`（含 AI 导入逻辑）/ `ProjectDetailSheet.tsx` / `ProjectSheets.tsx`：抽屉统一管理。
- 顶部统计区由深灰渐变横幅改为 4 个水平统计卡片：项目总数 / 施工中 / 已停工 / 已竣工，数字放大、图标加持。
- 移除浮球按钮，空状态引导更新为「点击右上角『新建』创建第一个项目」。

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 10.06s 通过；Playwright 截图项目列表页和新增弹窗均正常，弹窗居中。

### v4.0.5 — 2026-07-09 Phase 2 人员管理页面 UI/UX 重构

**改造内容：**

- 重写 `src/pages/workers/WorkerListPage.tsx` 为薄页面（82 行），拆分出：
  - `useWorkerList.ts`：基于 `useLiveQuery` 自动同步人员列表和分包单位，输出筛选后列表、统计数量、loading 状态。
  - `WorkerToolbar.tsx`：标题+数量 / 搜索框 / 新增按钮，移除浮球按钮。
  - `WorkerCard.tsx`：人员信息卡片，增加「离场」「删除」快捷操作。
  - `WorkerList.tsx`：4 个水平统计卡片 + 状态筛选胶囊 + 空状态。
  - `WorkerFormSheet.tsx` / `WorkerDetailSheet.tsx` / `WorkerSheets.tsx`：表单/详情抽屉统一管理。
- 顶部统计区由蓝色渐变横幅改为 4 个水平统计卡片：总登记 / 在岗 / 离场 / 停工，数字放大、图标加持。
- 在岗状态卡片显示「离场」快捷按钮，离场状态卡片显示「删除」快捷按钮。
- 状态筛选胶囊增加数量角标，选中态更明确。
- 空状态引导更新为「点击右上角『新增』添加第一条人员记录」。

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 16.21s 通过；Playwright 截图人员列表页和新增弹窗均正常，弹窗已居中。

### v4.0.4 — 2026-07-09 危大工程页面统计区视觉升级

**触发原因：** 用户截图反馈危大工程页面统计横幅「施工中 / 超危大 / 待专家论证」文字太小、不够高级。

**改造内容：**

- 改造 `src/pages/hazard-engine/HazardEnginePage.tsx` 顶部统计区：
  - 移除大面积红色渐变横幅。
  - 改为 4 个水平统计卡片：危大工程总数 / 施工中 / 超危大 / 待专家论证。
  - 数字放大到 `text-xl`、加粗、带图标；每个卡片用独立色块区分（slate / blue / red / amber）。
- 顶部改为单行工具栏：标题+数量 / 搜索框 /「登记」按钮，移除浮球按钮。
- 筛选胶囊字号与间距同步放大，选中态更明确。
- 空状态引导同步更新。

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 13.11s 通过；Playwright 截图验证危大工程页面新布局正常。

### v4.0.3 — 2026-07-09 全局弹窗组件 Sheet 居中改造

**触发原因：** 用户反馈现有 Sheet 采用底部上滑抽屉，标题高高在上、表单字段沉在屏幕下半部分，填写时视线上下移动，不够高级。

**改造内容：**

- 改造 `src/components/ui/sheet.tsx`：底部抽屉 → 居中 Dialog。
- 面板尺寸：`w-full max-w-[520px]`，`max-h-[85vh]` 内部滚动，四边圆角 `rounded-xl`。
- 动画：`slideUp` → 淡入 + 轻微缩放 + 小幅上移。
- 遮罩：`bg-black/40` 同步淡入。
- API 完全保持：`open` / `onClose` / `title` / `children` / `footer`，21 个调用方零改动。

**影响范围：** 全站所有 Sheet 弹窗（隐患新增/详情/整改/复查、模板库导入/变量映射/批量结果、人员/项目/教育/培训/验收/作业票/日志等表单）全部自动居中。

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 16.51s 通过；Playwright 截图隐患新增弹窗居中显示正常。

### v4.0.2 — 2026-07-09 Phase 2 隐患治理页面 UI/UX 重构

**触发原因：** 按 PROJECT_SPEC Section 29 已确认方案，启动 Phase 2 高频业务页改造，首站隐患治理。

**改造内容：**

| 改造项 | 涉及页面 | 改动前 | 改动后 |
|--------|---------|--------|--------|
| 顶部布局 | HazardListPage | 搜索框独占一行 + 状态胶囊独占一行 + 悬浮新增按钮 | 单行工具栏（标题+数量 / 搜索 / 新增），状态胶囊保留第二行 |
| 卡片快捷操作 | HazardCard | 仅有点击进详情 | 按状态显示「整改」「复查」「删除」快捷按钮 |
| 空状态 | HazardList | 弱提示「点击右下角 + 按钮新增」 | 图标 + 明确引导「点击右上角『新增』创建第一条隐患」 |
| 大文件拆分 | HazardListPage | 523 行单文件 | 82 行页面 + 1 Hook + 8 组件 |
| 数据同步 | useHazardList | `useEffect + useState` 手动拉取 | `useLiveQuery` 自动响应 IndexedDB，按当前项目过滤 |

**新增文件：** 9 个
- `src/pages/inspection/hooks/useHazardList.ts`
- `src/pages/inspection/components/HazardToolbar.tsx`
- `src/pages/inspection/components/HazardList.tsx`
- `src/pages/inspection/components/HazardCard.tsx`
- `src/pages/inspection/components/HazardSheets.tsx`
- `src/pages/inspection/components/AddHazardSheet.tsx`
- `src/pages/inspection/components/HazardDetailSheet.tsx`
- `src/pages/inspection/components/RectifySheet.tsx`
- `src/pages/inspection/components/ReviewSheet.tsx`

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 18.44s 通过；Playwright 截图验证隐患列表页、新增抽屉正常。

### v4.0.1 — 2026-07-09 代码规范修复（质量流水线第1轮）

**触发原因：** 对照 PROJECT_SPEC Section 26 开发守则自查，发现 5 个新模块页面违反多项铁律。

**修复内容：**

| 修复项 | 涉及页面 | 改动前 | 改动后 |
|--------|---------|--------|--------|
| useEffect→useLiveQuery | 5 个页面全部 | `useEffect` + `useState` 手动 fetch | `useLiveQuery` 自动响应 IndexedDB 变化 |
| 大文件拆分 | EmergencyPage | 529 行单文件 | 62 行页面 + 3 Form + 3 Table + 1 Hook（共 8 个文件） |
| 大文件拆分 | AccidentPage | 302 行单文件 | 61 行页面 + Stats + Form + Table + 1 Hook（共 5 个文件） |
| 大文件拆分 | PpePage | 272 行单文件 | 58 行页面 + Form + Table + 1 Hook（共 4 个文件） |
| 大文件拆分 | EquipmentPage | 271 行单文件 | 58 行页面 + Form + Table + 1 Hook（共 4 个文件） |
| 大文件拆分 | SafetyCostPage | 228 行单文件 | 58 行页面 + Stats + Form + Table + 1 Hook（共 5 个文件） |

**新增文件：** 26 个（5 个 Hook + 15 个组件 + 6 个目录结构）

**验证结果：** `npx tsc --noEmit` 零错误，`npx vite build` 17.89s 通过

**备份：** `F:\安全管理平台\backup\安全管理平台_backup_20260709_001728`

## 二十九、UI/UX 重构方案（产品经理视角，已确认实施中）

> 状态：**已确认，Phase 2 实施中**。用户已确认方案无后续影响，按 Phase 顺序执行，每阶段完成后更新本节状态并补充到变更记录。
> 触发原因：模板库预览中右侧内容区仍显拥挤、缺少快捷交互按钮；进一步扫描发现全站 27 个页面普遍存在「顶部垂直堆叠」「卡片信息拥挤」「缺少交互式按钮」等共性问题。

### 29.1 全站共性问题诊断

逐个查看 `src/pages` 下 27 个模块页面后，发现以下产品级体验问题：

| 问题 | 典型表现 | 用户痛点 | 涉及页面 |
|------|---------|---------|---------|
| **顶部垂直堆叠** | 统计 banner → 搜索框 → 状态筛选 → 类型筛选，各占一行 | 首屏有效内容区被压缩，小白找不到重点 | 模板库、知识库、隐患、人员、项目、危大、教育、培训、验收、作业票、日志等几乎所有列表页 |
| **搜索框孤立** | 搜索框单独占满一行 | 浪费横向空间，视觉上与筛选/操作割裂 | 上述所有列表页 |
| **缺少交互式快捷按钮** | 只有右下角悬浮「+」；卡片上无编辑/删除/状态变更入口；无批量操作 | 每次操作都要点进详情再返回，效率低 | 模板库、隐患、人员、危大、教育、培训、验收、作业票等 |
| **卡片信息拥挤** | 标签、图标、文字、日期挤在一起，间距和字重层次不清 | 扫一眼找不到关键信息 | 所有卡片列表页 |
| **空状态弱** | 只有文字「暂无xx，点击右下角+按钮」 | 用户不知道下一步具体该做什么 | 所有列表页 |
| **大文件未拆分** | 单文件 400-800 行，组件、Hook、Sheet 全堆一起 | 维护困难，违反 Section 26 | 模板库 821 行、隐患 523 行、教育 419 行、培训 536 行、作业票 519 行、项目 647 行等 |
| **useEffect 手动 fetch** | `useEffect + useState` 拉 IndexedDB | 数据不同步、切页丢状态 | 模板库、知识库、危大、工作台、项目、人员、隐患、教育、培训、验收、作业票、日志等 |

### 29.2 设计目标

从「能用」升级到「好用、好看、小白不看说明书就会用」：

1. **首屏效率**：一屏内能看到搜索 + 筛选 + 至少 3-4 条列表记录。
2. **操作触手可及**：常用操作在卡片上或工具栏上直接可点，不超过 2 步。
3. **信息层次分明**：一眼能区分「标题 / 关键状态 / 次要元信息 / 操作」。
4. **全站一致性**：所有列表页遵循同一套布局、间距、交互模式。
5. **工程化兜底**：同步完成拆分 + useLiveQuery，不欠技术债。

### 29.3 全站统一列表页设计规范

#### 29.3.1 顶部工具栏：一行定律

所有列表页顶部统一为**单行工具栏**（特殊情况如模板库含左侧分类树除外）：

```
┌─────────────────────────────────────────────────────────────────────┐
│ 页面标题 (数量)   [🔍 搜索框______]   [筛选 ▼] [排序 ▼] [+ 新增]    │
└─────────────────────────────────────────────────────────────────────┘
```

**规则：**

- 左侧：页面标题 + 记录总数（如「隐患治理（12）」）。
- 中间：搜索框，宽度自适应，占位文案具体到可搜索字段（如「搜索姓名/身份证/电话」）。
- 右侧：
  - 筛选按钮（下拉展开状态/类型筛选，替代占一行的胶囊标签）。
  - 排序按钮（按时间/名称/状态排序）。
  - 主要操作按钮（新增/导入/生成）。
- 高频状态仍保留横向胶囊标签，但**最多一行**，溢出收入「更多筛选」。

#### 29.3.2 统计信息：融入标题或筛选标签

不再使用大面积 gradient banner 独占顶部。统计数字改为：

- 显示在标题右侧小字（如「隐患治理（12 · 待整改 3）」）。
- 或显示在筛选胶囊标签内（如「待整改(3)」「施工中(2)」）。
- 极重要的 dashboard 数据保留在首页/统计看板，不在业务列表页占空间。

#### 29.3.3 列表卡片：统一信息层次

所有卡片统一为三层结构：

```
┌────────────────────────────────────────────────────────────┐
│ [图标]  标题                        [状态标签]  [更多 ▼]   │
│        元信息行1 · 元信息行2 · 元信息行3                    │
│        [快捷操作: 编辑] [删除] [状态变更]                   │
└────────────────────────────────────────────────────────────┘
```

**规则：**

- 标题：14px font-medium，最多一行截断。
- 状态标签：紧挨标题右侧，用颜色区分优先级。
- 元信息：12px text-gray-500，用「·」分隔，最多两行。
- 快捷操作：默认隐藏，hover/触摸时长按/点击「更多」展开，显示该卡片最常用的 1-3 个操作。
- 间距：卡片内边距 p-3，卡片间距 space-y-2.5，元信息行间距 0.5。

#### 29.3.4 交互式按钮矩阵

每个页面根据业务补充以下交互按钮：

| 页面 | 卡片快捷操作 | 工具栏操作 | 批量操作 |
|------|-------------|-----------|---------|
| 模板库 | 生成 / 变量映射 / 删除 | 导入 ▼ / 扫描 | 批量生成 / 删除 |
| 知识库 | 查看切片 / 删除 | 导入文件 / 手动添加 | - |
| 隐患 | 整改 / 复查 / 删除 | 新增隐患 / 筛选 | - |
| 人员 | 编辑 / 标记离场 / 删除 | 新增人员 / 导入 | - |
| 危大工程 | 编辑 / 删除 | 新增 / 筛选 | - |
| 教育/培训 | 编辑 / 删除 / 考核登记 | 新增 / 筛选 | - |
| 验收 | 编辑 / 删除 | 新增 / 筛选 | - |
| 作业票 | 批准 / 驳回 / 关闭 / 删除 | 新开作业票 / 筛选 | - |

#### 29.3.5 空状态：带直接行动按钮

空状态统一为：

```
┌────────────────────────────────────────┐
│           [大图标]                     │
│      暂无隐患记录                      │
│   点击右上角「新增隐患」按钮开始登记   │
│        [+ 新增隐患]                    │
└────────────────────────────────────────┘
```

#### 29.3.6 全局弹窗组件规范：居中 Dialog，禁止底部抽屉

> 触发原因：现有 `Sheet` 组件采用底部上滑抽屉（`items-end` + `slideUp`），导致表单标题高高在上、字段和按钮沉在屏幕下半部分，用户填写时视线频繁上下移动，且全站 21 处弹窗风格不统一。

**规范：**

- 所有表单、详情、确认类弹窗统一为**屏幕居中 Dialog**。
- 面板宽度：`w-full max-w-[520px]`，四边圆角 `rounded-xl`。
- 高度：内容自适应，超长内容时 `max-h-[85vh]` + 内部滚动。
- 动画：淡入 + 轻微缩放（`opacity 0→1` + `scale 0.95→1`），取消底部上滑。
- 遮罩：`bg-black/40`，与面板同步淡入。
- 标题栏、关闭按钮、footer 按钮布局保持不变。
- API 保持不变：`open` / `onClose` / `title` / `children` / `footer`。

**实施方式：**

直接改造 `src/components/ui/sheet.tsx`，不改动 21 个调用方。改造后：
- 隐患治理的新增/详情/整改/复查弹窗自动居中。
- 模板库的导入/变量映射/批量结果/手动变量弹窗自动居中。
- 人员/项目/教育/培训/验收/作业票/日志等所有表单弹窗自动居中。

**验收：**
- `npx tsc --noEmit` 零错误。
- `npx vite build` 通过。
- Playwright 截图验证隐患新增弹窗、模板库弹窗居中且无错乱。

### 29.4 逐页面改造方案

#### 第一阶段：模板库（问题最严重，优先）

- 顶部改为：分类标题 + 模板数量 / 搜索框 / 导入下拉 / 扫描按钮，单行。
- 删除 `{{}}` 提示，改为中文占位符说明。
- 全选 + 批量操作合并为一行。
- 卡片增加「生成」「变量映射」「删除」快捷按钮。
- 工程化拆分：Page + Hook + 10 个组件，≤200 行。
- `useLiveQuery` 拉取模板和分类树。

#### 第二阶段：高频业务页

**隐患治理（HazardListPage）** ✅ 已实施
- 顶部一行：标题+数量 / 搜索 / 新增（状态胶囊作为第二行保留，符合隐患状态驱动工作流）。
- 状态胶囊一行：全部 / 待整改(N) / 整改中(N) / 复查中(N) / 已闭环。
- 卡片增加「整改」「复查」「删除」快捷操作（根据状态显示）。
- 拆分：Page + `useHazardList` + HazardToolbar + HazardList + HazardCard + HazardSheets + AddHazardSheet + HazardDetailSheet + RectifySheet + ReviewSheet。
- `useLiveQuery` 拉取隐患列表，按当前项目自动过滤，切页不丢状态。

**人员管理（WorkerListPage）** ✅ 已实施
- 顶部一行：标题+数量 / 搜索 / 新增按钮，移除浮球按钮。
- 统计区改为 4 个水平统计卡片：总登记 / 在岗 / 离场 / 停工，数字放大、图标加持。
- 卡片增加「离场」「删除」快捷操作（在岗显示「离场」，离场显示「删除」）。
- 状态筛选胶囊增加数量角标，选中态更明确。
- 拆分：Page + `useWorkerList` + WorkerToolbar + WorkerList + WorkerCard + WorkerSheets（含 Form/Detail）。
- `useLiveQuery` 拉取人员列表和分包单位，按当前项目自动过滤。

**项目管理（ProjectListPage）** ✅ 已实施
- 顶部一行：标题+数量 / 搜索 / 新建按钮，移除浮球按钮。
- 统计区改为 4 个水平统计卡片：项目总数 / 施工中 / 已停工 / 已竣工，数字放大、图标加持。
- 当前项目卡片高亮，非当前项目显示「切换到此项目」快捷按钮。
- 拆分：Page + `useProjectList` + ProjectToolbar + ProjectList + ProjectCard + ProjectSheets（含 Form/Detail，保留 AI 导入）。
- `useLiveQuery` 拉取项目列表。

**危大工程（HazardEnginePage）** ✅ 已实施（视觉层）
- 顶部改为单行工具栏：标题+数量 / 搜索 / 登记按钮，移除浮球按钮。
- 统计区由大面积红色渐变横幅改为 4 个水平统计卡片：危大工程总数 / 施工中 / 超危大 / 待专家论证，数字放大、图标加持、色块分区。
- 筛选胶囊字号与间距同步放大，选中态更明确。
- 空状态引导更新为「点击右上角『登记』按钮创建第一条危大工程」。

#### 第三阶段：其他列表页

**教育、培训、验收、作业票、日志**
- 统一按 29.3 规范改造顶部工具栏和卡片。
- 拆分 Sheet 到独立文件。
- `useLiveQuery` 替换手动 fetch。
- 卡片增加业务相关快捷操作（如培训的「考核登记」、作业票的「批准/关闭」）。

#### 第四阶段：首页、知识库、设置

**首页（HomePage）**
- 保持现有卡片布局，但改用 `useLiveQuery` 实时同步数据。
- 待处理提示根据数据动态生成，增加「去处理」快捷入口。

**知识库（KnowledgePage）**
- 顶部一行：标题+数量 / 搜索 / 分类筛选下拉 / 添加。
- 文档卡片增加「展开切片」「删除」快捷操作。
- 拆分：Page + Hook + KnowledgeCard + CategoryFilter + AddDocumentSheet。
- `useLiveQuery` 拉取文档和统计。

**设置/变量设置（SettingsPage / VariableSettingsPage）**
- 保持表格形式，但优化信息密度和编辑交互。
- 变量设置中隐藏 `{{}}`，只展示中文标签和当前值。

### 29.5 工程化执行守则

1. **改前备份**：每次 Phase 开始前完整备份到 `backup/安全管理平台_backup_YYYYMMDD_HHMMSS`。
2. **单文件 ≤200 行**：Page 58-80 行，Hook/Card/Sheet 各 ≤200 行。
3. **useLiveQuery 优先**：所有 IndexedDB 查询通过 `useLiveQuery`，删除 `loadXxx()` 手动刷新逻辑。
4. **组件职责单一**：Page 只组装，Hook 管数据，Card/Sheet/Filter 管呈现。
5. **不破坏现有功能**：改造后原有增删改查、表单校验、抽屉交互必须全部保留。
6. **改后自检**：每个 Phase 结束后 `npx tsc --noEmit` 零错误 + `npx vite build` 通过。
7. **自动测试**：每个 Phase 调用 `webapp-testing` 技能截图验证关键页面无错乱。
8. **变更记录**：每完成一个 Phase 更新 Section 二十八。

### 29.6 实施节奏（建议）

为避免一次改动过大，建议分 4 个 Phase 实施：

| Phase | 页面 | 预计文件数 | 关键产出 |
|-------|------|-----------|---------|
| Phase 1 | 模板库 | ~12 个 | 首屏一屏可见、无 `{{}}`、批量生成可用 |
| Phase 2 | 隐患、人员、项目、危大工程 | ~20 个 | 高频业务页统一工具栏 + 卡片快捷操作 |
| Phase 3 | 教育、培训、验收、作业票、日志 | ~18 个 | 其余列表页统一规范 |
| Phase 4 | 首页、知识库、设置 | ~8 个 | 全站 useLiveQuery 化完成 |

### 29.7 验收标准

- [ ] 所有列表页顶部工具栏控制在一行（含搜索+主要操作）。
- [ ] 所有列表页卡片遵循统一三层信息层次。
- [ ] 高频操作（编辑/删除/状态变更）在卡片上可直接点击，无需进入详情。
- [ ] 空状态带直接操作按钮。
- [ ] 模板库不再出现 `{{变量名}}` 提示。
- [ ] 改造页面均使用 `useLiveQuery`，删除 `useEffect + useState` 手动 fetch。
- [ ] 所有改造页面单文件 ≤200 行。
- [ ] `npx tsc --noEmit` 零错误。
- [ ] `npx vite build` 通过。
- [ ] `webapp-testing` 截图验证每个 Phase 关键页面无布局错乱。

## 第三十、人员证件备案与变量系统优化方案

> 对应用户 2026-07-09 提出的 5 项整改需求：人员证件备案+过期提醒、变量结构清晰化、模板库 UI 大气化、模板点击即编辑、中文变量名支持。
> 本方案经用户确认后实施，实施后更新本节状态。

### 30.1 人员证件备案与过期提醒

#### 30.1.1 现状
- `Certificate` 类型与 `certificates` 表已存在（`src/types/db.ts`、`src/db/index.ts`）。
- `workerService` 已提供 `getCertificates`、`addCertificate` 接口。
- 但 `WorkerFormSheet` 未录入证件，`WorkerDetailSheet` 未展示证件。
- 首页「待处理」未扫描证件过期状态。

#### 30.1.2 整改目标
- 人员表单支持录入多本证件（类型、证号、发证机关、发证日期、有效期、附件）。
- 附件支持图片（`image/*`）或 PDF，存为 base64。
- 详情页列出证件并显示状态：正常 / 即将过期（≤30 天）/ 已过期。
- 首页待处理自动汇总「已过期证件」和「30 天内过期证件」。

#### 30.1.3 数据结构（无需改表）

沿用现有 `Certificate` 接口：

```typescript
export interface Certificate extends BaseEntity {
  workerId: string
  certType: string           // 身份证/特种作业证/安全C证/健康证/其他
  certNumber?: string
  issueDate?: string
  expiryDate?: string
  issueAuthority?: string
  attachmentUrl?: string     // base64 或 blob url
}
```

#### 30.1.4 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/pages/workers/components/WorkerFormSheet.tsx` | 新增「证件备案」区块：证件类型下拉、证号、发证机关、发证日期、有效期、附件上传；支持添加/删除多本证件。 |
| `src/pages/workers/components/WorkerDetailSheet.tsx` | 新增「证件信息」列表，按过期状态标色，支持查看附件。 |
| `src/services/workerService.ts` | 新增 `saveCertificates(workerId, certificates)` 批量覆盖保存。 |
| `src/pages/home/HomePage.tsx` | 待处理提示增加证件过期扫描，按人员聚合显示。 |

#### 30.1.5 过期判定规则
- 已过期：`expiryDate < 今天`
- 即将过期：`今天 <= expiryDate <= 今天 + 30 天`
- 正常：`expiryDate > 今天 + 30 天`
- 无有效期视为长期有效，不参与提醒。

#### 30.1.6 附件处理
- 前端读取 File 为 base64，存入 `attachmentUrl`。
- 详情页直接以 `<img>` 或 `<iframe>` 预览。
- 单文件上限 5MB，超限 toast 提示。

---

### 30.2 变量结构清晰化

#### 30.2.1 现状
- `VariableMappingEditor.tsx` 使用 12 列网格，字段名显示英文（`name`, `code`, `location`）。
- 变量无分组，来源选择项平铺，视觉上「乱」。

#### 30.2.2 整改目标
- 变量按业务分组展示：项目基础信息、参建单位、项目人员、日期、自定义变量。
- 所有字段映射选项显示中文，不再暴露英文数据库字段名。
- 增加变量搜索框，支持按变量名/显示名过滤。
- 未映射变量置顶并高亮。

#### 30.2.3 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/components/business/VariableMappingEditor.tsx` | 重构为分组卡片式布局；字段下拉中文显示；增加搜索框；保留原有映射行为。 |
| `src/pages/templates/components/VariableMappingSheet.tsx` | 调整头部信息展示，增加「未映射 X 项」提示。 |

#### 30.2.4 字段中文对照

```typescript
const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: '项目名称',
  code: '项目编号',
  location: '项目地点',
  startDate: '计划开工日期',
  endDate: '计划竣工日期',
  contractor: '施工单位',
  supervisor: '监理单位',
  owner: '建设单位',
  managerName: '项目经理',
  techDirector: '技术负责人',
  safetyOfficer: '安全员',
  safetyOfficerPhone: '安全员电话',
  description: '项目简介',
}
```

---

### 30.3 模板库 UI 大气化

#### 30.3.1 现状
- `TemplateLibraryPage` 默认折叠分类树（`treeCollapsed = true`）。
- `CategoryTree` 操作按钮 hover 才显示。
- 模板卡片操作区拥挤，删除按钮藏在「更多」菜单里。

#### 30.3.2 整改目标
- 分类树默认展开，取消折叠模式。
- 分类操作按钮（编辑、删除）始终可见。
- 模板卡片整体可点击进入编辑，操作按钮大气、直接。
- 整体字号、间距、图标尺寸提升一档。

#### 30.3.3 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/pages/templates/TemplateLibraryPage.tsx` | 移除 `treeCollapsed` 状态与折叠开关；aside 固定宽度 `w-56`。 |
| `src/components/business/CategoryTree.tsx` | 删除 `collapsed`/`onToggleCollapse` 属性与折叠模式渲染；操作按钮 `opacity-100`；图标、字号、间距加大。 |
| `src/pages/templates/components/TemplateCard.tsx` | 卡片整体可点击；操作按钮加大间距；删除按钮直接外露。 |
| `src/pages/templates/components/TemplateList.tsx` | 保持现有职责，仅配合卡片点击行为。 |

#### 30.3.4 交互细节
- 点击分类树节点：仅切换分类过滤，不再触发折叠。
- 点击模板卡片主体：打开变量映射编辑 Sheet。
- 点击「生成」按钮：直接生成 Word（保持现有逻辑）。
- 点击「删除」按钮：确认后删除（阻止卡片点击冒泡）。

---

### 30.4 模板点击即编辑

#### 30.4.1 现状
- `TemplateCard` 仅复选框和按钮可点击，卡片主体无点击事件。

#### 30.4.2 整改目标
- 点击模板卡片任意位置（除复选框、生成/删除按钮外）打开变量映射编辑。
- 视觉反馈：hover 时边框加深、轻微阴影。

#### 30.4.3 实现要点
- `TemplateCard` 最外层 `Card` 添加 `onClick={onEdit}` 与 `cursor-pointer`。
- 复选框、生成按钮、删除按钮的 `onClick` 调用 `e.stopPropagation()`，避免误触发编辑。
- 与 30.3 中模板库 UI 改造合并实施。

---

### 30.5 中文变量名支持

#### 30.5.1 现状
- `templateService.extractVariables` 已支持提取 `{}` 内任意字符，包括中文。
- 但内置变量 `id` 为英文（`projectName`），模板中实际替换仍依赖英文 key。
- 变量编辑器显示 `{{projectName}}`，不符合用户「用中文编辑」的诉求。

#### 30.5.2 整改目标
- 模板中的变量统一以中文命名，如 `{{项目名称}}`、`{{施工单位}}`。
- 变量映射编辑器中，变量名和显示名均展示中文。
- 文档生成时，以中文变量名作为 docxtemplater 的 data key。

#### 30.5.3 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/services/variable-settings.service.ts` | 将 `BUILTIN_VARIABLES` 的 `id` 与 `label` 统一为中文（如 `id: '项目名称'`），`projectField`/`extraFieldKey` 仍保留英文以对应数据库字段。 |
| `src/components/business/VariableMappingEditor.tsx` | 变量名显示中文；字段选择中文；不再展示 `{{}}` 包裹的英文 key。 |
| `src/services/templateService.ts` | 生成文档时，将中文变量名作为 key 传入 docxtemplater。 |
| `src/services/template-generate.service.ts`（如存在） | 同步适配中文 key。 |

#### 30.5.4 兼容性处理
- 已导入的旧模板若包含英文变量，仍按原英文 key 渲染（兜底）。
- 新导入模板统一提示用户使用中文变量名。

---

### 30.6 实施节奏

| Phase | 内容 | 修改文件数 | 关键产出 |
|-------|------|-----------|---------|
| Phase 1 | 模板库 UI 大气化 + 点击编辑 + 分类树展开 | ~4 个 | 模板库默认展开、按钮外露、卡片可点击 |
| Phase 2 | 中文变量名 + 变量结构清晰化 | ~3 个 | 中文变量、分组展示、字段中文 |
| Phase 3 | 人员证件备案 + 过期提醒 | ~4 个 | 证件上传、列表展示、首页待处理提醒 |
| Phase 4 | 整体验证 | - | tsc 零错误、vite build 通过、Playwright 截图 |

### 30.7 验收标准

- [ ] 分类树默认展开，无折叠按钮。（**未实施** → 已并入 31.3 统一实施）
- [x] 分类编辑/删除按钮始终可见。
- [x] 点击模板卡片主体打开变量映射编辑。
- [x] 模板变量以中文显示和替换（如 `{{项目名称}}`）。
- [x] 变量映射界面按分组展示，字段名中文显示。
- [x] 人员表单可上传多本证件（图片/PDF）。
- [x] 人员详情展示证件及过期状态。
- [x] 首页待处理显示证件过期提醒。
- [x] `npx tsc --noEmit` 零错误。
- [x] `npx vite build` 通过。
- [x] `webapp-testing` 截图验证模板库、人员、首页、变量设置无错乱。

---

### v4.0.0 — 2026-07-08 品牌升级 + 独立应用重构

- 品牌：智安台账 → 溜哥的安全管理平台
- 技术路线：WPS 加载项 → Electron 独立桌面应用
- UI：360px 任务窗格 → 1280x800 全桌面，7 组 27 模块侧边栏
- 编辑器：docx-editor（Word）+ Univer Sheets（Excel）
- 新增 5 模块：劳保用品、机械设备、应急管理、事故管理、安全费用
- 变量系统重写：21 内置变量，中文标签，无 `{{}}` 语法
- 清理 WPS 相关文件 40+ 个

---

## 第三十一、模板库稳定性与核心功能补齐方案

> 对应用户 2026-07-09 反馈：删除模板崩溃、文件夹管理不符合预期、缺少文档预览编辑、缺少变量预览编辑。
> 本方案经用户确认后实施，实施后更新本节状态。

### 31.1 现状复盘与规范符合性检查

#### 31.1.1 已符合 PROJECT_SPEC.md 的部分

- 模板卡片整体可点击打开变量映射（30.4）。
- 内置变量已改为中文命名（30.5）。
- 变量映射编辑器已按分组展示、字段中文显示（30.2）。
- Sheet 弹窗已居中、fade-in + scale 动画（29.3.6 / v4.0.3）。

#### 31.1.2 不符合规范、需要整改的部分

- **分类树仍存在折叠行为**：PROJECT_SPEC.md 第 30.3.2 条明确要求"分类树默认展开，取消折叠模式"，第 30.3.3 条要求删除折叠逻辑，但 30.3 实施时**仅完成了按钮外露、卡片点击等改动，去折叠未实施**。当前 `CategoryTree.tsx` 仍保留 `expanded` 状态、`toggle` 函数、`ChevronRight`/`ChevronDown` 折叠图标、`isExpanded` 条件渲染。**本节 31.3 将覆盖实施 30.3 未完成的部分，30.3 中与去折叠相关的描述在本节之后视为过期。**
- **删除模板稳定性不足**：用户报告删除任意模板即出现“Details”崩溃页；当前代码缺少对删除过程中异步边界、选中态同步、渲染时序的防御性处理。
- **文档预览编辑功能缺失**：当前点击模板仅打开变量映射 Sheet，无法预览 Word 文档内容，也没有实施预览/编辑能力。
- **变量预览编辑功能缺失**：当前只能做“变量→数据源”映射，无法看到每个变量在当前项目下的实际解析值，也无法在预览模式下直接修改变量值并实时看到渲染效果。

### 31.2 删除模板崩溃修复

#### 31.2.1 根因假设

在本地 headless 测试中未直接复现崩溃，但结合代码结构与用户截图（Electron 渲染进程崩溃后的 Details 页），风险点集中在：

1. **状态更新时序**：`handleDelete` 在 `templateService.remove(id)` 返回后才清理 `selected` 与 `selectedIds`，如果 `useLiveQuery` 在此期间触发重渲染，列表会尝试渲染已被删除的模板引用。
2. **Sheet 卸载与动画冲突**：删除当前正在编辑的模板时，`selected` 被置空导致 `VariableMappingSheet` 立即卸载，可能和 Radix/自定义 Sheet 的退出动画产生竞态。
3. **IndexedDB 异步异常未收敛**：`db.templates.delete` 失败或事务异常未被完整捕获，可能抛出未处理的 rejection。
4. **Toast/confirm 在卸载后调用**：异步回调中组件可能已卸载，继续操作状态会触发 React warning 或更严重的渲染错误。

#### 31.2.2 修复方案

| 修改文件 | 修改点 |
|---------|--------|
| `src/pages/templates/TemplateLibraryPage.tsx` | 1. `handleDelete` 先清空 `selected` 与 `selectedIds`，再执行数据库删除。2. 增加 `isDeleting` 标记，删除期间禁用对应卡片操作。3. 使用 `try/finally` 确保状态恢复。 |
| `src/pages/templates/components/TemplateCard.tsx` | 删除按钮增加 `disabled` 状态；点击区域增加 `data-template-id` 便于测试定位。 |
| `src/pages/templates/components/TemplateList.tsx` | 透传 `deletingId` 给卡片。 |
| `src/pages/templates/TemplateLibraryPage.tsx` | 引入 `ErrorBoundary` 包裹主内容区，防止单点崩溃导致整页白屏。 |
| `src/components/ui/ErrorBoundary.tsx`（新建） | React class component，捕获渲染错误，fallback 显示"页面出错了，请刷新重试" + 重试按钮。包裹 `props.children`，`componentDidCatch` 记录 `console.error`。 |
| `src/db/repositories/template.repo.ts` | 无需修改——`remove` 调用 `this.table.delete(id)`，Dexie 自动在隐式事务中执行，单条删除不需要显式事务。 |

#### 31.2.3 删除流程（伪代码）

```typescript
const handleDelete = async (id: string) => {
  if (!confirm('确定删除这个模板吗？')) return
  setDeletingId(id)
  // 1. 先清 UI 态，避免渲染已删数据
  if (selected?.id === id) setSelected(null)
  setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
  try {
    await templateService.remove(id)
    toast.success('已删除')
  } catch (err) {
    toast.error('删除失败：' + (err instanceof Error ? err.message : '未知错误'))
  } finally {
    setDeletingId(null)
  }
}
```

### 31.3 文件夹管理重构

#### 31.3.1 整改目标

- 彻底取消分类树折叠行为：所有一级、二级分类默认全部展开，不显示 Chevron 图标，不支持点击展开/折叠。
- 分类操作按钮始终可见：新建、重命名、删除按钮直接外露，不再依赖右键菜单或 hover。
- 支持模板跨分类移动：在模板卡片上提供“移动到分类”下拉；支持批量移动。
- 分类树在视觉上更“大气”：增加图标尺寸、行高、间距，与模板库整体风格一致。

#### 31.3.2 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/components/business/CategoryTree.tsx` | 1. 删除 `expanded`/`setExpanded`/`toggle` 状态与逻辑。2. 删除 Chevron 图标。3. 递归渲染所有节点，默认全部展开。4. 新建/重命名/删除按钮常驻显示。5. 简化右键菜单或作为辅助保留。6. 图标尺寸统一为 `w-10 h-10`，行高增加。 |
| `src/pages/templates/TemplateLibraryPage.tsx` | 增加 `moveTemplateToCategory(id, categoryId)`，支持单条模板移动。 |
| `src/pages/templates/components/TemplateCard.tsx` | 增加“移动”下拉按钮（或接收 `onMove` 回调）。 |
| `src/pages/templates/components/TemplateList.tsx` | 透传 `onMove` 与分类列表；批量操作栏增加“移动到分类”。 |
| `src/pages/templates/components/TemplateToolbar.tsx` | 顶部工具栏增加“新建文件夹”常驻按钮。 |
| `src/db/repositories/category.repo.ts` | 保留现有 `removeWithCascade`（级联删除分类及其下所有模板），**不做"移入未分类"**——用户确认：删分类意味着该分类下的模板也不保留。如需保留模板，请先移动到其他分类。 |

#### 31.3.3 交互细节

- 点击分类节点：仅切换过滤，不再触发折叠。
- 新建分类：顶部常驻“新建文件夹”按钮，点击后在树中插入输入框。
- 重命名：每行右侧常驻铅笔图标。
- 删除分类：每行右侧常驻垃圾桶图标；内置分类不可删除。
- 移动模板：模板卡片操作区增加“移动”图标按钮，下拉选择目标分类；选择后 toast 提示“已移动到 XXX”。

### 31.4 文档预览编辑功能

#### 31.4.1 整改目标

- 在模板详情/编辑 Sheet 中增加“文档预览”页签，使用 `mammoth` 将 docx 转换为 HTML 进行只读预览。
- 预览内容支持缩放、全屏、在新标签页打开原始文件。
- 提供“渲染预览”：在预览页中先按当前变量映射解析变量值，再用 docxtemplater 渲染出新 docx，再转换为 HTML 预览，实现“填完值后的文档长什么样”。
- 基础编辑能力：在渲染预览模式下，允许用户修改可编辑变量值（见 31.5），实时刷新预览；不做完整 Word 在线编辑（超出 MVP 范围，且现有依赖无 docx-editor）。

#### 31.4.2 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/pages/templates/components/TemplatePreviewSheet.tsx`（新建） | 三栏或两栏布局：左侧变量/操作，右侧预览区。支持“原始文档预览”和“渲染后预览”切换。 |
| `src/pages/templates/components/VariableMappingSheet.tsx` | 增加“文档预览”按钮/页签，点击打开 `TemplatePreviewSheet`。 |
| `src/services/template-preview.service.ts`（新建） | 封装 `previewOriginal(buffer)` 与 `previewRendered(buffer, data)`，使用 mammoth + docxtemplater。 |
| `src/pages/templates/components/TemplateSheets.tsx` | 引入 `TemplatePreviewSheet` 及其状态。 |
| `src/pages/templates/TemplateLibraryPage.tsx` | 增加 `previewTemplate` 状态与 `openPreview` 回调。 |

#### 31.4.3 技术要点

- mammoth 转换使用 `mammoth.convertToHtml({ arrayBuffer })`，CSS 注入打印样式保证分页观感。
- 渲染预览流程：调用 `generate.service.renderSingle` 获取 Blob → ArrayBuffer → mammoth HTML。
- 大文件上限：>10MB 时仅提供下载，不渲染预览，避免内存问题。
- 预览区使用 `overflow-auto` + 固定高度，避免 Dialog 内部滚动冲突。

### 31.5 变量预览编辑功能（重点）

#### 31.5.1 整改目标

- 在模板编辑界面新增“变量预览”页签，与“变量映射”并列。
- 自动按当前项目解析每个变量的实际值（调用 `generate.service.resolveValue`）。
- 对 `manual` 来源变量，允许直接在预览页中输入/修改默认值，修改后实时影响渲染预览。
- 对 `field`/`extraField` 来源变量，显示“来自项目信息：XXX”，不可编辑但可跳转项目信息。
- 高亮未填写、缺少必填的变量，生成前给出明确提示。
- 提供“一键生成”按钮：预览确认后直接下载 Word。

#### 31.5.2 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/pages/templates/components/VariablePreviewEditor.tsx`（新建） | 变量预览编辑组件：表格/卡片式展示变量、当前值、来源、编辑框、必填标识。 |
| `src/pages/templates/components/VariableMappingSheet.tsx` | 重构为页签形式：Tab1“变量映射”、Tab2“变量预览”。 |
| `src/services/template-preview.service.ts` | 提供 `resolveVariableValues(mappings, ctx)` 统一解析变量值。 |
| `src/services/generate.service.ts` | 将 `resolveValue` 导出，供预览服务调用；修复 formula 在预览时 siblingData 为空的问题。 |
| `src/pages/templates/TemplateLibraryPage.tsx` | 增加 `manualOverride` 状态，传递给预览组件；生成时传入 `manualValues`。 |

#### 31.5.3 交互细节

- 打开“变量预览”页签时自动解析一次，显示 loading 骨架屏。
- `manual` 变量输入框失焦自动保存到 `manualOverride`，不保存到数据库（仅本次生成有效）。
- 切换回“变量映射”页签不丢失已填写的手动值。
- 点击“生成文档”时，若仍有必填变量未填，弹出手动输入浮层（复用现有 `ManualVariablesSheet`）。

### 31.6 实施节奏

| Phase | 内容 | 修改文件数 | 关键产出 |
|-------|------|-----------|---------|
| Phase 1 | 删除模板稳定性修复 + 分类树去折叠 | ~5 个 | 删除不崩溃、分类树全部展开、按钮外露 |
| Phase 2 | 文件夹管理补齐：移动模板、新建/重命名/删除分类常驻 | ~6 个 | 模板可跨分类移动、分类管理大气直观 |
| Phase 3 | 文档预览功能（原始 + 渲染后） | ~4 个 | 模板可预览、可查看填值后效果 |
| Phase 4 | 变量预览编辑功能（重点） | ~5 个 | 变量实际值可见、手动值可编辑、实时渲染预览 |
| Phase 5 | 整体验证 | - | tsc、vite build、Playwright 截图、删除/移动/预览功能人工走查 |

### 31.7 验收标准

- [ ] 删除任意模板（包括当前正在编辑的模板）不白屏、不崩溃，toast 提示正常。
- [ ] 删除过程中对应卡片进入禁用态，不可重复点击。
- [ ] 分类树所有节点默认展开，无 Chevron 折叠图标，无折叠交互。
- [ ] 分类新建/重命名/删除按钮始终可见，内置分类不可删除。
- [ ] 模板卡片支持“移动到分类”，批量操作支持“移动到分类”。
- [ ] 点击模板可打开“文档预览”，能看到原始 Word 内容（HTML 渲染）。
- [ ] 预览模式支持切换“渲染后预览”，按当前变量映射和项目信息显示填值后的文档。
- [ ] “变量预览”页签显示每个变量的当前解析值，manual 变量可直接编辑。
- [ ] 修改变量值后，渲染预览实时刷新。
- [ ] `npx tsc --noEmit` 零错误。
- [ ] `npx vite build` 通过。
- [ ] Playwright 截图验证模板库、文档预览、变量预览页面无错乱。
- [ ] PROJECT_SPEC.md 本节验收标准全部勾选，changelog 增加 v4.0.8 记录。

---

### v4.0.8 — 2026-07-09 模板库稳定性与核心功能补齐（已实施）

**触发原因：** 用户反馈删除模板崩溃、文件夹管理不符合预期、缺少文档预览编辑与变量预览编辑功能。

**改造内容：**

- 删除模板稳定性：先清 UI 态再删数据，增加删除中禁用态与 ErrorBoundary 兜底。
- 文件夹管理：分类树彻底去折叠，按钮常驻；新增模板跨分类移动与批量移动。
- 文档预览：新增 `TemplatePreviewSheet`，支持原始 docx 预览与渲染后预览。
- 变量预览编辑：新增 `VariablePreviewEditor`，实时显示变量解析值，支持手动变量编辑与实时渲染刷新。

**验证结果：** 删除稳定性修复（先清UI态再删数据 + ErrorBoundary）、分类树去折叠、按钮常驻、模板移动功能均已实现；`npx tsc --noEmit` 零错误，`npx vite build` 通过。文档预览（TemplatePreviewSheet）和变量预览编辑（VariablePreviewEditor）推迟至 v4.1.0 实施。

---

## 第三十二、文档编辑、变量中文化与项目信息同步方案

> 对应用户 2026-07-09 追加反馈：Word/Excel 编辑功能缺失、.doc 无法导入、变量名仍存在英文 {{}} 形式、项目/企业扩展字段修改后变量设置未同步。
> 本方案经用户确认后实施，实施后更新本节状态。

### 32.1 问题现状与根因

#### 32.1.1 Word/Excel 在线编辑与 .doc 导入缺失

- 项目 v4.0.0 变更记录中已规划“编辑器：docx-editor（Word）+ Univer Sheets（Excel）”，但实际代码未落地。
- 当前 `package.json` 无 Word/Excel 编辑器依赖；`mammoth` 仅用于知识库文本提取，未用于模板预览编辑。
- `.doc` 文件在 `template-import.service.ts` 的 `UNSUPPORTED_EXTS` 列表中，仅提示导入失败，未提供任何转换或编辑入口。

#### 32.1.2 变量名仍暴露英文 `{{}}` 形式

- `VariableMappingEditor.tsx` 第 148–149 行仍在变量卡片下方显示 `{{${m.name}}}`，若模板变量名为英文（如旧模板或扩展字段 key）则直接暴露英文。
- `ProjectFormSheet.tsx` 的“其他扩展字段”区域直接以 `key`（如 `designUnit`、`surveyUnit`）作为字段标签，未映射为中文。
- 模板导入时 `inferMapping` 对未匹配变量返回 `label: name`，英文变量名直接作为标签展示。
- 系统提示文案、占位符中仍存在 `{{projectName}}`、`{{开工日期}}` 等写法，强化了“变量 = 花括号包裹”的认知，与用户“变量名默认就是中文名，不再使用 {{英文}}”的诉求冲突。

#### 32.1.3 项目/企业扩展字段修改后变量设置不同步

- `VariableSettingsPage.tsx` 从 `useAppStore` 读取 `currentProject`，但 `ProjectFormSheet.tsx` 保存项目后仅调用 `onSuccess()`，未更新 store 中的 `currentProject`。
- 结果：用户在“项目管理”中填写的设计单位、勘察单位、安全负责人等扩展字段，保存后切换到“设置-台账变量”，看到的仍是旧值或“（未填写）”。

### 32.2 整改目标

1. **Word/Excel 在线编辑**：在模板预览/编辑界面提供基础在线编辑能力；Word 使用文档编辑器组件，Excel 使用表格编辑器组件。
2. **.doc 导入支持**：对 `.doc` 文件给出明确的转换/编辑入口，至少支持上传后提示用户并允许在编辑器中查看/另存为 `.docx`。
3. **变量名全面中文化**：所有面向用户的界面只展示中文变量名/中文标签，不再显示 `{{}}` 或英文 key；模板变量默认以中文命名。
4. **项目信息实时同步**：项目保存后自动刷新 `currentProject`，变量设置页实时反映最新项目信息。

### 32.3 Word/Excel 在线编辑与 .doc 支持

#### 32.3.1 技术选型与决策

| 文件类型 | 选型 | 决策 |
|---------|------|------|
| Word (.docx) | **`@eigenpal/docx-editor-react`** | 已安装 Apache 2.0 的 React DOCX 编辑器，支持浏览器端直接打开/编辑/保存 .docx，无需 WPS。 |
| Excel (.xlsx) | `@univerjs/preset-sheets-core` + `ExcelJS` 解析 | v4.0.0 已规划 Univer Sheets；对现有 .xlsx 先用 `ExcelJS` 解析为 `IWorkbookData` 再载入编辑器。 |
| .doc 转换 | `mammoth` 读取为 HTML 预览 | 浏览器端无稳定 .doc→docx 方案，预览后引导用户另存为 .docx 再导入。 |

> 实施策略：Word 走 docx-editor 做完整在线编辑；Excel 走 Univer Sheets 做在线编辑；.doc 仅做 mammoth 预览并引导转换。

#### 32.3.2 修改文件

| 文件 | 修改点 |
|------|--------|
| `package.json` | 已含 `@eigenpal/docx-editor-react`、`@univerjs/preset-sheets-core`、`exceljs`。 |
| `src/components/editors/DocxEditor.tsx`（新建） | 封装 `@eigenpal/docx-editor-react`，接收 `documentBuffer` + `onSave`。 |
| `src/components/editors/XlsxEditor.tsx` | 扩展 `fileBuffer` 属性：用 `ExcelJS` 解析 .xlsx 为 `IWorkbookData` 后载入。 |
| `src/pages/editor/DocxEditorPage.tsx`（新建） | Word 编辑器页面：读取模板、base64→ArrayBuffer、编辑、保存回 IndexedDB。 |
| `src/pages/editor/XlsxEditorPage.tsx`（新建） | Excel 编辑器页面：读取模板、base64→ArrayBuffer、解析、编辑、保存回 IndexedDB。 |
| `src/pages/templates/components/TemplateCard.tsx` | `.docx`/`.xlsx` 点击跳转 `/editor/docx?id=...` 或 `/editor/xlsx?id=...`；增加“变量”按钮打开映射弹窗。 |
| `src/pages/templates/TemplateLibraryPage.tsx` | 提供 `openEditorInNewPage` 导航逻辑；非 docx/xlsx 保持原弹窗编辑。 |
| `src/App.tsx` | 新增 `/editor/docx`、 `/editor/xlsx`、 `/editor` 路由。 |
| `src/config/features.ts` | `docxEditor` 开关设为 `true`，启用侧边栏菜单入口。 |
| `src/services/doc-convert.service.ts`（新建） | 封装 mammoth 读取 doc、生成 docx Blob 的兜底能力。 |

#### 32.3.3 交互细节

- 导入 `.doc` 时弹窗提示：".doc 为旧版格式，已转换为预览，请确认后另存为 .docx 再导入模板库。"
- 模板库中 `.docx` 模板点击卡片直接进入 `/editor/docx?id=...` 在线编辑；`.xlsx` 模板点击进入 `/editor/xlsx?id=...` 在线编辑。
- 编辑器页面顶部显示模板名称、返回按钮、保存按钮；保存后把二进制内容写回 IndexedDB 模板 `content` 字段。
- `.docx` 模板在文档预览页签仍保留 mammoth HTML 渲染结果作为快速查看方式。
- 编辑后的 Word/Excel 文件保存即覆盖原模板内容；后续“生成文档”直接基于最新内容。
- 变量映射弹窗对所有模板类型保留入口，通过卡片上的“变量”按钮进入。

### 32.4 变量名全面中文化

#### 32.4.1 整改目标

- 用户在任何界面看到的变量名都是中文标签，不再出现 `{{designUnit}}`、`{{projectName}}` 等。
- 模板中的变量仍使用 `{{中文变量名}}` 语法（docxtemplater 需要），但 UI 中只显示“中文变量名”。
- 扩展字段 key（如 `designUnit`）在项目中显示为中文标签“设计单位”。
- 旧模板中的英文变量名在导入时自动映射为中文内置变量；无法映射的，提示用户重命名。

#### 32.4.2 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/components/business/VariableMappingEditor.tsx` | 删除变量卡片下方的 `{{${m.name}}}` 展示；formula 占位符改为中文变量名示例；未匹配变量高亮并提示重命名。 |
| `src/pages/projects/components/ProjectFormSheet.tsx` | “其他扩展字段”区域：已存在的扩展字段 key 用中文标签展示；新增字段时输入中文名，系统自动生成英文 key 或直接使用中文 key（与 IndexedDB 兼容）。 |
| `src/pages/projects/components/ProjectDetailSheet.tsx` | 扩展字段展示中文标签。 |
| `src/services/variable-settings.service.ts` | 增加 `getExtraFieldLabel(key)` 映射表；BUILTIN_VARIABLES 中扩展字段的 `label` 保持中文。 |
| `src/services/template-import.service.ts` | `inferMapping` 对英文变量名（如 `projectName`、`constructionUnit`）增加中文映射表；无法映射时 label 仍用原名但标红提示。 |
| `src/services/generate.service.ts` | 保持 `{{` `}}` 分隔符内部使用 `m.name`（可能是中文或英文），不改动 docxtemplater 数据 key。 |
| `src/pages/templates/components/TemplateCard.tsx` | “X 个变量”提示不做变量名展示，仅显示数量。 |
| 全站提示/占位符文案 | 将所有 `{{projectName}}`、`{{开工日期}}` 等示例替换为纯中文说明，如“项目信息中的项目名称”。 |

#### 32.4.3 英文变量名映射表（示例）

```typescript
const ENGLISH_TO_CHINESE: Record<string, string> = {
  projectName: '项目名称',
  projectCode: '项目编号',
  projectLocation: '项目地点',
  constructionUnit: '施工单位',
  supervisorUnit: '监理单位',
  ownerUnit: '建设单位',
  designUnit: '设计单位',
  surveyUnit: '勘察单位',
  manager: '项目经理',
  safetyDirector: '安全负责人',
  // ... 其他常见英文变量名
}
```

### 32.5 项目信息实时同步到变量设置

#### 32.5.1 根因

`ProjectFormSheet.tsx` 保存项目后未刷新 `useAppStore.currentProject`，导致 `VariableSettingsPage.tsx` 读取的是旧项目对象。

#### 32.5.2 修改文件

| 文件 | 修改点 |
|------|--------|
| `src/pages/projects/components/ProjectFormSheet.tsx` | `handleSubmit` 成功后，若编辑的是当前项目，调用 `useAppStore.getState().setCurrentProject(project.id)` 刷新 store。 |
| `src/pages/projects/components/ProjectListPage.tsx` 或 `useProjectList.ts` | “切换到此项目”按钮调用 `setCurrentProject` 后，同步刷新变量设置等依赖页面（useLiveQuery 自动处理）。 |
| `src/pages/settings/VariableSettingsPage.tsx` | 使用 `useLiveQuery(() => projectRepo.getById(currentProjectId), [currentProjectId])` 直接订阅 IndexedDB 中当前项目的最新数据，替代 `useAppStore(s => s.currentProject)` 快照。 |
| `src/services/projectService.ts` | 增加 `getCurrent()` 或 `refreshCurrentProject()` 辅助，供 store 和页面统一调用。 |

#### 32.5.3 同步流程

```typescript
// ProjectFormSheet.tsx
const { setCurrentProject } = useAppStore()

await projectService.update(project.id, data)
// 如果修改的是当前项目，立即刷新 store
if (currentProjectId === project.id) {
  await setCurrentProject(project.id)
}
onSuccess()
```

### 32.6 与第三十一节的协同关系

- 第三十一节重点解决“模板库稳定性 + 文件夹管理 + 文档/变量预览”。
- 第三十二节重点解决“文档在线编辑 + 变量中文化 + 项目信息同步”。
- 实施顺序：先完成 31 的 Phase 1\u20132（删除稳定、文件夹管理，含 CategoryTree.tsx 去折叠），再推进 32 的变量中文化与项目同步。CategoryTree.tsx 的改动统一在 31.3 完成，32.4 不再修改该文件；Univer Sheets 集成放在 31 的 Phase 3\u20134 之后作为独立 Phase 实施。

### 32.7 实施节奏

| Phase | 内容 | 修改文件数 | 关键产出 |
|-------|------|-----------|---------|
| Phase 1 | 变量名中文化：VariableMappingEditor、ProjectFormSheet 扩展字段中文标签、英文变量映射 | ~6 个 | 用户看不到英文 key 和 `{{}}` |
| Phase 2 | 项目信息实时同步：保存项目后刷新 store、VariableSettingsPage 用 useLiveQuery | ~4 个 | 项目信息修改后变量设置立即更新 |
| Phase 3 | .doc 导入支持：mammoth 预览、另存为 docx 引导 | ~3 个 | .doc 不再直接报错 |
| Phase 4 | Word 在线编辑：集成 `@eigenpal/docx-editor-react` | ~4 个 | .docx 可在线打开/编辑/保存 |
| Phase 5 | Excel 在线编辑：集成 Univer Sheets + ExcelJS 解析 | ~4 个 | .xlsx 可在线打开/编辑/保存 |
| Phase 6 | 模板库联动与菜单启用：卡片跳转、路由、feature flag | ~3 个 | 点击模板直接进入编辑器 |
| Phase 7 | 整体验证 | - | tsc、vite build、Playwright、功能走查 |

### 32.8 验收标准

- [ ] `.docx` 模板点击卡片进入 `/editor/docx?id=...`，`@eigenpal/docx-editor-react` 正常渲染并支持编辑。
- [ ] `.xlsx` 模板点击卡片进入 `/editor/xlsx?id=...`，Univer Sheets 正常渲染并支持编辑。
- [ ] 编辑器页面保存后，模板 `content` 字段更新，再次进入编辑器可见最新内容。
- [ ] Word/Excel 编辑器均支持返回模板库、显示模板名称、防止未保存误关闭提示。
- [ ] 导入 `.doc` 文件不直接报错，弹出转换/编辑提示，可另存为 `.docx`。
- [ ] 变量映射界面不再显示 `{{}}` 包裹的英文变量名。
- [ ] 项目表单的“其他扩展字段”全部显示中文标签。
- [ ] 模板导入时，常见英文变量名自动映射为中文内置变量。
- [ ] 在项目管理中修改设计单位、勘察单位、安全负责人等扩展字段后，切换到设置-台账变量立即看到新值。
- [ ] 切换当前项目后，变量设置页自动刷新显示新项目信息。
- [ ] `npx tsc --noEmit` 零错误。
- [ ] `npx vite build` 通过。
- [ ] Playwright 截图验证项目管理、变量设置、模板库、Word/Excel 编辑器无错乱。
- [ ] PROJECT_SPEC.md 本节验收标准全部勾选，changelog 增加 v4.0.9 记录。

---

### v4.0.9 — 2026-07-09 文档编辑、变量中文化与项目信息同步（已实施）

**触发原因：** 用户反馈 Word/Excel 编辑功能缺失、.doc 无法导入、变量名仍存在英文 `{{}}` 形式、项目扩展字段修改后变量设置未同步。

**改造内容：**

- Word 在线编辑：集成 `@eigenpal/docx-editor-react`，新增 `DocxEditor.tsx` 与 `/editor/docx` 页面，支持 .docx 打开/编辑/保存。
- Excel 在线编辑：扩展 `XlsxEditor.tsx` 与 `/editor/xlsx` 页面，用 `ExcelJS` 解析已有 .xlsx 后载入 Univer Sheets 编辑并保存。
- 模板库联动：`.docx`/`.xlsx` 模板卡片点击进入对应编辑器；保留“变量”按钮进入变量映射弹窗。
- 菜单与路由启用：`docxEditor` feature flag 开启，`/editor` 路由生效，侧边栏显示“文档编辑器”。
- .doc 导入支持：不再直接拒绝，打开 mammoth 预览并提示转换为 docx。
- 变量名全面中文化：VariableMappingEditor 不再展示 `{{}}` 英文；ProjectFormSheet 扩展字段显示中文标签；英文变量导入自动映射中文。
- 项目信息同步：保存项目后刷新 store.currentProject；VariableSettingsPage 使用 useLiveQuery 订阅最新项目。

**验证结果：**

- `npx tsc --noEmit` 零错误；`npx vite build` 通过。
- Excel 编辑器修复完成：`.xlsx` 模板点击卡片进入 `/editor/xlsx?id=...` 后，Univer Sheets 网格正常渲染，单元格数据可见，工具栏/公式栏/工作表标签均显示。
- 修复点：
  1. `package.json` 显式添加 `@univerjs/themes` 依赖，解决 Vite 预构建时主题模块加载异常。
  2. `XlsxEditor.tsx` 补传 `theme: defaultTheme`；并改为在容器获得实际尺寸（≥200×200）后再初始化 Univer，避免 canvas 因容器宽度为 0 而无法渲染。
  3. `xlsx-univer.service.ts` 对 `columnData` 增加宽度有效性校验，避免无效列宽导致 `The column width is less than 0` 报错。
  4. `XlsxEditor.tsx` 增加 `onChange` 回调，通过监听 `CommandExecuted` 事件识别数据变更，`XlsxEditorPage` 据此启用保存按钮并提示“有未保存修改”。
- 已知非致命问题：控制台仍偶现 `[getThemeColors] Cannot destructure property 'exportedColors' of 'undefined'`，来自 Univer 内部主题初始化时序，不影响网格渲染和编辑保存，后续可升级 Univer 版本进一步消除。

---

## 版本汇总

| 版本 | 日期 | 状态 | 内容 |
|------|------|------|------|
| v4.0.7 | 2026-07-09 | 已实施 | 人员证件备案、变量系统优化、模板库 UI 大气化、模板点击编辑、中文变量名 |
| v4.0.8 | 2026-07-09 | 已实施 | 模板库稳定性（删除崩溃修复）、文件夹管理、按钮常驻、模板移动（文档预览/变量预览推迟至 v4.1.0） |
| v4.0.9 | 2026-07-09 | 已实施 | Word/Excel 在线编辑、模板库联动、变量中文化、项目信息同步、.doc 导入 |
| v4.1.0 | 2026-07-09 | 部分实施 | 日报智能继承已实施；AI 智能驱动（语音/OCR/NLP）、配置化变量映射引擎、双通道输入设计待实施 |
| v4.1.1 | 2026-07-10 | 已实施 | 产品体验优化：移除冗余导航入口、日报模板选择弹窗、文件夹功能可见性增强、Excel变量编辑侧边栏、变量编辑一键映射+自动中文化 |
| v4.1.2 | 2026-07-10 | 已实施 | Bug修复：分类树新分类不显示、变量面板英文残留、Word编辑器无限加载、光标插入变量不可用、Excel变量面板缺少操作按钮 |
| v4.1.3 | 2026-07-10 | 已实施 | 修复 Word 首次加载 loading 竞态条件、插入变量 DOM 降级策略、变量面板默认值框加标签说明 |
| v4.1.4 | 2026-07-10 | 已实施 | 修复 insertText 根本性失效：从 execCommand 改为 ProseMirror state.tr.insertText() 原生 API；确认 Excel 变量面板按钮代码正确 |
| v4.2.0 | 2026-07-10 | 已实施 | 变量面板防抖提交+稳定key+虚拟滚动+tooltip；CategoryTree liveQuery 驱动+拖拽排序+自定义确认弹窗 |
| v4.2.1 | 2026-07-10 | 已实施 | 修复变量输入失焦（useEffect 引用比对→内容比对）；修复分类树操作后不刷新（treeVersion 手动刷新） |
| v4.2.2 | 2026-07-10 | 已实施 | 分类树 useLiveQuery→useState+useEffect；变量面板非受控模式+key重挂载；插入字段 label||name+自动填充name |

---

## 第三十三、AI 智能驱动方案（语音、OCR、NLP）

> 触发原因：用户核心痛点是每日从工地返回后极度疲劳，希望一键生成日报、周报、月报及自动归档资料。本方案将 AI 能力注入现有数据管道，实现「说话→结构化数据→自动填表→生成 Word」的全自动链路。
> 状态：**方案已确认，待实施。**

### 33.1 总体架构

```
语音输入 →  ASR 转写  →  NLP 语义解析  →  结构化数据确认  →  写入数据库  →  生成 Word
   │            │              │               │               │              │
   │      阿里云/腾讯云     DeepSeek API      用户确认面板     各 service     模板引擎
   │      一句话识别        prompt 工程       可编辑修正       (已有)       (已有)
   │
   └── 键盘输入（无 AI 时兜底）→ 结构化表单 → 直接写入数据库 → 生成 Word
```

**核心原则：** AI 是加速器，不是必需品。无 AI 时键盘表单自动接管，流程不中断。

### 33.2 技术选型

| 能力 | 选型 | 决策理由 |
|------|------|---------|
| 语音转文字 (ASR) | 阿里云/腾讯云一句话识别 API | 浏览器端 MediaRecorder 采集音频，传 base64 到 ASR 接口；按量付费，低延迟 |
| 语义理解 (NLP) | DeepSeek API（已有 [ai.service.ts](file:///f:/安全管理平台/src/services/ai.service.ts)） | 利用现有 LLM 底座，写专用 prompt 将自然语言映射为 JSON schema |
| OCR 证件识别 | 百度 OCR / 阿里云 OCR 结构化识别 | 身份证、驾驶证、合格证均有专用接口，准确率 ≥95% |
| OCR 隐患照片分类 | DeepSeek-VL / 通义千问-VL | 视觉大模型做隐患类型识别+描述生成，需人工确认环节 |

### 33.3 新增服务

```
src/services/
├── ai.service.ts          ← 已有，需扩展：extractDailyReport()、extractCertInfo()
├── voice.service.ts       ← 新建：封装 ASR 调用 + 浏览器录音（MediaRecorder API）
├── ocr.service.ts         ← 新建：封装 OCR 调用（身份证/驾驶证/合格证）
└── report.service.ts      ← 新建：日报/周报/月报数据聚合 + LLM 润色 + 模板生成
```

### 33.4 NLP 语义解析：从口语到结构化数据

**输入示例（用户语音转写结果）：**

> "早上巡查发现3处隐患，下午对张三李四做了安全教育，1点发现违规开了一张罚单，晚上做了新工人交底。"

**DeepSeek prompt 模板：**

```typescript
const SYSTEM_PROMPT = `你是建筑工程安全管理数据提取专家。请从用户的安全工作汇报中提取结构化数据，严格按以下JSON格式返回，只返回JSON：

{
  "hazards": { "count": 数字, "items": [{ "title": "隐患描述", "level": "一般/较大/重大/特别重大" }] },
  "education": { "count": 数字, "topic": "教育主题", "attendees": ["姓名1", "姓名2"] },
  "penalties": { "count": 数字, "items": [{ "unit": "被处罚单位", "amount": 金额, "reason": "违规原因" }] },
  "training": { "count": 数字, "topic": "培训主题", "organizer": "组织方" },
  "newWorkers": { "count": 数字, "names": ["姓名1"], "hasDisclosure": true/false },
  "workContent": "今日施工内容概述",
  "summary": "一句话总结今日工作"
}

规则：
- 如果某个类别没有提及，对应字段设为 null
- 金额单位默认为"元"
- 人名用中文逗号分隔
- 不要编造任何信息，只提取用户明确说到的内容`
```

**输出（AI 解析结果）：**

```json
{
  "hazards": { "count": 3, "items": [] },
  "education": { "count": 1, "topic": "安全教育", "attendees": ["张三", "李四"] },
  "penalties": { "count": 1, "items": [{ "unit": "未指定", "amount": 0, "reason": "违规作业" }] },
  "training": null,
  "newWorkers": { "count": 0, "names": [], "hasDisclosure": true },
  "workContent": "",
  "summary": "巡查发现3处隐患，开展安全教育，处罚1次违规，完成新工人交底"
}
```

### 33.5 OCR 自动归档流程

```
用户拍照上传
    │
    ▼
┌─────────────────────────────────────────────┐
│  系统识别照片类型（证件/合格证/隐患照片）       │
│                                              │
│  身份证 → OCR 提取姓名/证号/地址              │
│        → 自动创建 Worker 记录                │
│        → 自动关联三级教育台账                 │
│                                              │
│  驾驶证 → OCR 提取姓名/证号/准驾车型/有效期    │
│        → 自动创建 Certificate 记录            │
│        → 自动设置到期提醒                     │
│                                              │
│  机械合格证 → OCR 提取设备名称/型号/编号/有效期 │
│           → 自动创建 Equipment 记录           │
│           → 关联驾驶员（如有）                │
│                                              │
│  隐患照片 → 视觉模型分类 + 描述生成            │
│         → 人工确认后存入 Hazard 记录           │
└─────────────────────────────────────────────┘
```

**新增 UI 组件：**
- `src/components/ai/OcrPreview.tsx`：OCR 识别结果预览面板，高亮识别字段，允许用户修正后确认写入
- `src/components/ai/AiConfirmPanel.tsx`：AI 解析结果确认面板，用户可逐条编辑修正

### 33.6 实施优先级

| 优先级 | 模块 | 预估工作量 | 用户价值 |
|--------|------|-----------|---------|
| P0 | 语音日报生成（ASR + NLP → 结构化数据 → Word） | 5-7 天 | 最高，直接解决"累了一天不想打字" |
| P1 | OCR 证件识别（身份证/驾驶证/合格证） | 5-7 天 | 高，减少手工录入 |
| P2 | 周报/月报自动汇总（数据聚合 + LLM 润色） | 5-7 天 | 高，周五/25号自动触发 |
| P3 | OCR 隐患照片分类 | 7-10 天 | 中，需人工确认环节 |

---

## 第三十四、配置化变量映射引擎

> 触发原因：甲方频繁变更模板，每次都需要开发人员介入修改代码。需要将"模板"与"数据"彻底解耦，实现模板即插即用。
> 状态：**方案已确认，待实施。**

### 34.1 核心架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        配置化变量映射引擎                          │
├──────────────┬──────────────┬──────────────┬─────────────────────┤
│  ① 模板解析器 │  ② 变量字典  │  ③ 映射配置器 │  ④ 渲染引擎         │
│  (Parser)    │  (Dictionary)│  (Mapper)    │  (Renderer)         │
├──────────────┼──────────────┼──────────────┼─────────────────────┤
│ 扫描 .docx   │ 所有可用变量  │ 可视化映射    │ docxtemplater      │
│ 提取占位符   │ 的注册中心    │ 拖拽配置界面  │ 填入数据输出 Word   │
│ 标准化命名   │ 含中文标签    │ 模板→字典绑定 │                     │
│              │ 数据来源标注  │              │                     │
└──────────────┴──────────────┴──────────────┴─────────────────────┘
```

### 34.2 ① 模板解析器（Parser）

**职责：** 接收任意 .docx 文件，提取所有 `{{占位符}}`，标准化为平台可识别的变量名。

**处理流程：**
```
用户上传模板 .docx
    → 解压 .docx（本质是 ZIP），读取 document.xml
    → 合并被 Word 拆分的 <w:t> 片段（已有经验：Section 27.3）
    → 正则提取所有 {{...}} 占位符
    → 标准化：
      - 中文占位符（如 {{项目名称}}）→ 直接匹配字典
      - 英文占位符（如 {{projectName}}）→ 查英文→中文映射表，自动转换
      - 未识别占位符 → 标记为"待配置"
    → 输出：变量清单 [{ name, displayName, isMatched, suggestedSource }]
```

**与现有代码关系：** 扩展 [template-import.service.ts](file:///f:/安全管理平台/src/services/template-import.service.ts) 的 `extractVariables` 方法，增加标准化和别名匹配逻辑。

### 34.3 ② 变量字典（Dictionary）

**职责：** 平台所有可用变量的唯一注册中心。每个变量登记：中文名、数据类型、数据来源、如何取值。

**数据结构：**

```typescript
interface VariableDefinition {
  id: string                    // 唯一标识，如 "projectName"
  displayName: string           // 用户看到的中文名，如 "项目名称"
  aliases: string[]             // 别名列表，用于模板自动匹配
  category: string              // 分组：项目信息 / 人员 / 隐患 / 统计
  dataType: 'text' | 'number' | 'date' | 'list' | 'image'
  source: {
    type: 'field' | 'statistic' | 'related' | 'manual' | 'system'
    resolver: string            // 取值函数名
    params?: Record<string, any>
  }
  format?: string
  defaultValue?: string
}
```

**与现有代码关系：** 升级 [variable-settings.service.ts](file:///f:/安全管理平台/src/services/variable-settings.service.ts) 的 `BUILTIN_VARIABLES` 从静态列表为注册中心，支持动态注册、别名匹配、分组管理。

### 34.4 ③ 映射配置器（Mapper）

**职责：** 提供可视化界面，让用户将模板占位符绑定到字典变量。**这是用户唯一需要操作的界面。**

**界面布局：** 左侧模板占位符列表 + 中间映射关系 + 右侧变量字典，采用卡片式绑定。

**自动匹配规则（用户零操作）：**
1. 精确匹配：模板占位符 `{{项目名称}}` = 字典 `displayName` → 自动绑定
2. 别名匹配：模板占位符 `{{projectName}}` = 字典 `aliases` → 自动绑定
3. 模糊匹配：关键词命中 → 推荐候选，用户确认
4. 未匹配：标记"待配置"，用户手动拖拽

**手动绑定：** 点击未匹配项 → 弹出字典搜索面板 → 选择目标变量；字典中无对应变量时，用户可即时创建新变量定义并绑定。

**与现有代码关系：** 重构 [VariableMappingEditor.tsx](file:///f:/安全管理平台/src/components/business/VariableMappingEditor.tsx) 从 12 列 grid 表格改为卡片式双栏布局。

### 34.5 ④ 渲染引擎（Renderer）

**职责：** 接收模板 + 映射配置，按当前上下文解析所有变量值，调用 docxtemplater 生成 Word。

**与现有代码关系：** 改造 [generate.service.ts](file:///f:/安全管理平台/src/services/generate.service.ts) 的 `renderSingle` 方法——不再从模板的 VariableMapping 表读映射，而是从映射配置器产出的 MappingConfig 读映射。

### 34.6 甲方换模板的响应流程

```
甲方发来新模板
    → 用户拖入平台 → 自动解析占位符 → 自动匹配 80%+ 变量
    → 手动确认剩余 1-2 个未匹配项 → 保存映射配置
    → 切换到新模板，一键生成
    ⏱ 总耗时：2 分钟，零代码修改
```

### 34.7 英文→中文变量映射表（部分）

| 原始技术标识 (Logic) | 用户展示名称 (Display) | 适用场景 |
| :--- | :--- | :--- |
| `projectName` | 项目名称 | 所有文档的标题和页眉 |
| `contractor` | 施工单位 | 安全协议、整改通知单的落款 |
| `safetyOfficer` | 安全员 | 日报/周报/检查记录的责任人签名 |
| `inspectionDate` | 检查日期 | 安全日志、隐患整改单的日期 |
| `hazardCount` | 隐患数量 | 日报/周报/月报的统计数字 |
| `rectifyDeadline` | 整改期限 | 隐患整改通知单的截止日期 |
| `trainingTopic` | 培训主题 | 安全教育记录、三级教育台账的标题 |
| `attendeeNames` | 参与人员 | 安全会议签到表、培训记录的参与人列表 |
| `penaltyAmount` | 罚款金额 | 违规处罚单的金额 |
| `weatherCondition` | 天气状况 | 施工日志的天气记录 |
| `equipmentName` | 设备名称 | 机械设备台账、检验记录的设备标识 |
| `certExpiryDate` | 证件有效期 | 人员证件、设备检验的到期提醒 |

---

## 第三十五、日报智能继承与复用

> 触发原因：每日日报内容重复度高（项目名称、安全员、常规巡查内容基本相同），手动从零编写效率低。需要"昨日内容自动继承"机制，今日日报基于昨日内容微调而非从零开始。
> 状态：**已实施（日报继承）。周报/月报自动汇总待实施。**

### 35.1 核心设计：数据快照 + 按条目继承

**为什么不能复用 Word？** 昨日生成的 Word 是扁平化的排版文件，隐患列表、教育记录已变成表格文字，无法反向解析出结构化条目。继承必须在数据层做。

**数据快照模型：**

日报快照复用现有的 `DailyLog` 表，通过 `items` 字段保存结构化条目。不再单独建立 `DailyReportSnapshot` 表，以减少数据冗余并保证日报草稿与快照同源。

```typescript
// src/types/db.ts
export interface DailyReportItem {
  id: string
  type: 'hazard' | 'education' | 'training' | 'penalty' | 'workContent' | 'custom'
  title: string                   // 用户看到的描述
  data: Record<string, unknown>   // 完整结构化数据
  inherited: boolean              // 是否从昨天继承
  modified: boolean               // 继承后是否被修改
  sourceDate?: string             // 原始来源日期
}

export interface DailyLog extends BaseEntity {
  date: string
  projectId?: string
  // ... 其他字段
  items?: DailyReportItem[]        // v4.1.0 结构化日报条目快照，用于日报继承
}
```

### 35.2 两种继承模式

**模式 A：一键全量继承（适合"今天跟昨天差不多"）**

```
用户打开日报页 → 系统检测昨天有日报 → 展示三个选项
  [从昨天复制全部] → 昨天所有条目复制到今日表单，标记"继承自昨天"
  [选择性复用] → 展示工作项清单，勾选要复用的
  [空白开始] → 从零填写

用户操作：删除不适用项 → 修改有变化项 → 新增今日独有项 → 改天气/手动变量 → 生成
预计耗时：30秒-1分钟
```

**模式 B：选择性复用（适合"只有部分内容重复"）**

展示昨日工作项清单，按类型分组（隐患/教育/培训/处罚/交底），每条可勾选。已勾选的填入今日表单，未勾选的不带入。

**目的：** 已闭环的隐患、昨天独有的处罚等不适用内容，不会被带入今日。

### 35.3 周报的双重继承

周报有两类数据来源，系统自动合并：

1. **本周日报数据自动汇总**：隐患总数、闭环率、教育次数、处罚金额等统计数字，由系统自动聚合
2. **上周周报遗留问题继承**：跨周期未解决的事项（如"北侧脚手架连墙件缺失已持续 8 天"）从上周周报继承

> 状态：周报自动汇总功能尚未实施，规划在 v4.1.x 后续迭代完成。

### 35.4 与模板系统的集成

```
昨日日报数据快照 → 继承引擎 → 今日日报结构化数据 → 变量映射引擎 → 公司模板 → 输出 Word
```

**继承只发生在数据层，模板完全不变。** 模板映射配置（Section 34）已提前配好，继承引擎产出的数据直接走现有生成管道。

### 35.5 实现文件

| 文件 | 说明 |
|------|--------|
| `src/types/db.ts` | 新增 `DailyReportItem`、`DailyReportFormData`、`DailyReportSubmitData` 接口；`DailyLog` 扩展 `items` 字段 |
| `src/db/index.ts` | 数据库版本升至 7，新增 `penalties` 表 |
| `src/db/repositories.ts` | 新增 `penaltyRepo` |
| `src/services/daily-report.service.ts` | 日报继承核心服务：`getYesterdayLog()`、`buildInheritGroups()`、`itemsToFormData()` |
| `src/services/penaltyService.ts` | 处罚记录 CRUD，日报中处罚条目落地存储 |
| `src/components/ai/InheritSelector.tsx` | 继承模式选择器（复制全部/选择性复用/空白开始） |
| `src/components/ai/StructuredReportForm.tsx` | 结构化日报表单；支持 `initialData` 与 `inheritedKeys`，显示/清除继承标记 |
| `src/pages/report/DailyReportPage.tsx` | 日报编辑页：加载昨日日报 → 继承选择 → 表单编辑 → 保存业务数据 → 生成 Word |
| `src/pages/home/HomePage.tsx` | 新增"填写今日日报"快速入口 |
| `src/App.tsx` | 注册 `/report/daily` 路由 |

---

## 第三十六、双通道输入兼容性设计

> 触发原因：语音输入依赖网络和 AI 服务，在弱网或 AI 不可用时必须保证流程闭环。键盘输入是核心兜底方案。
> 状态：**方案已确认，待实施。**

### 36.1 设计策略：语音为主通道，键盘为兜底，同框共存

```
              ┌─────────────────────────┐
              │      首页入口            │
              │  [🎤 语音日报] [⌨ 手动]  │
              └──────────┬──────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   ┌──────────────┐              ┌──────────────┐
   │  语音通道     │              │  键盘通道     │
   │  AI 可用时    │              │  AI 不可用时   │
   │  自动启用     │              │  自动接管      │
   └──────┬───────┘              └──────┬───────┘
          │                             │
          ▼                             ▼
   ASR 转写 → NLP 解析          结构化表单直接填写
          │                             │
          └──────────┬──────────────────┘
                     ▼
              用户确认面板
                     │
                     ▼
              写入数据库 → 生成 Word
```

### 36.2 状态切换逻辑

| 当前状态 | 触发条件 | 切换后状态 | UI 变化 |
|---------|---------|-----------|--------|
| 语音待命 | 点击麦克风 | 录音中 | 按钮变红+波形动画 |
| 录音中 | 停止说话 2 秒 | 转写确认 | 显示转写文本，可编辑 |
| 转写确认 | 点击"确认" | AI 解析中 | 按钮变灰+旋转 |
| AI 解析中 | AI 返回结果 | 结果确认 | 结构化数据卡片 |
| 结果确认 | 点击"写入" | 完成 | 绿勾+生成按钮 |
| 任意状态 | 按 Ctrl+Enter | 键盘输入态 | 麦克风缩小，展开文本框 |
| 键盘输入态 | 点击麦克风 | 语音待命 | 恢复麦克风界面 |

### 36.3 无 AI 兜底：结构化日报表单

当 DeepSeek API 不可用时，首页顶部显示黄色横幅：`⚠️ AI 服务暂不可用，已切换为手动录入模式。`

此时展示**结构化日报速填表单**，将 AI 原本要自动提取的字段逐一列出：

```
┌─────────────────────────────────────────────────┐
│  日报速填（离线模式）                             │
│                                                 │
│  日期：2026-07-09   天气：[晴 ▼]                 │
│                                                 │
│  ── 今日巡查 ────────────────────────────────── │
│  发现隐患 [ 3 ] 处                               │
│  [+ 新增隐患]  [1. 脚手架连墙件缺失] [2. ...]    │
│                                                 │
│  ── 安全教育 ────────────────────────────────── │
│  ☑ 开展了安全教育  参与人员：[张三, 李四]        │
│                                                 │
│  ── 违规处罚 ────────────────────────────────── │
│  ☑ 发现违规   单位：[土方队]   金额：[500]       │
│                                                 │
│  ── 培训学习 ────────────────────────────────── │
│  ☑ 参加了培训   内容：[防汛应急培训]             │
│                                                 │
│  ── 新工人交底 ──────────────────────────────── │
│  ☑ 进场三级教育   人数：[3]                     │
│                                                 │
│              [💾 保存]  [📄 生成日报]            │
└─────────────────────────────────────────────────┘
```

**两条路径，同一个终点：**
```
有 AI → 语音/键盘 → ASR → NLP → 确认 → 写入 DB → 生成 Word
无 AI → 键盘 → 结构化表单 → 直接写入 DB → 生成 Word
```

### 36.4 新建/修改文件

| 文件 | 修改点 |
|------|--------|
| `src/components/ai/VoiceInput.tsx`（新建） | 录音按钮 + 波形动画 + 转写结果展示 |
| `src/components/ai/AiConfirmPanel.tsx`（新建） | AI 解析结果确认面板，可逐条编辑修正 |
| `src/components/ai/StructuredReportForm.tsx`（新建） | 无 AI 兜底的结构化日报表单 |
| `src/pages/home/HomePage.tsx` | 新增语音/键盘入口卡片、AI 状态横幅 |
| `src/services/voice.service.ts`（新建） | 封装 ASR 调用 + MediaRecorder 录音 |

---

## 三十七、Vibe Coding 实施策略

### 37.1 Trae 技能使用指南

本阶段新增功能优先使用 Trae 内置技能加速开发：

| 技能 | 适用场景 | 使用方式 |
|------|---------|---------|
| `frontend-design` | 创建所有新增 UI 组件（VoiceInput、AiConfirmPanel、StructuredReportForm、InheritSelector、OcrPreview） | 调用时告知"全桌面安全管理系统，teal 主色 #0F766E，shadcn/ui 组件，Tailwind CSS" |
| `web-artifacts-builder` | 复杂多组件页面（DailyReportPage、WeeklyReportPage） | 用于含多个交互组件的日报编辑页 |
| `web-dev` | 从零创建新模块页面 | 用于 OcrPreview、映射配置器等独立功能模块 |
| `webapp-testing` | 每个 Phase 验收 | 启动 dev server，自动跑关键流程，截图验证 |

### 37.2 实施节奏

| Phase | 内容 | 关键产出 | 技能调用 |
|-------|------|---------|---------|
| Phase 1 | 变量映射编辑器重构（卡片式） | 用户可自行配置映射 | `frontend-design` |
| Phase 2 | 结构化日报表单（键盘兜底） | 无 AI 也能生成日报 | `frontend-design` + `web-dev` |
| Phase 3 | 日报继承引擎 | 昨日数据自动复用 | `web-dev` + `webapp-testing` |
| Phase 4 | 语音输入 + NLP 解析 | 说话→日报 | `frontend-design` + `webapp-testing` |
| Phase 5 | OCR 证件识别 | 拍照→自动登记 | `frontend-design` + `webapp-testing` |
| Phase 6 | 周报/月报自动汇总 | 一键聚合生成 | `web-dev` + `webapp-testing` |
| Phase 7 | 整体验证 | tsc、vite build、Playwright | `webapp-testing` |

### 37.3 核心理念

**先做兜底，再做 AI。** 键盘表单是地基，AI 语音是加速器。地基稳了，AI 管道随时可以接上去。每一 Phase 做完都能独立交付价值，不因等待 AI 接口而阻塞。

---

### v4.1.0 — 2026-07-09 AI 智能驱动与配置化映射引擎（方案已确认，部分实施）

**触发原因：** 用户核心痛点是"从工地回来后极度疲劳，希望一键生成日报/周报/月报"，以及"甲方频繁换模板时无需重新开发"。

**已实施：**
- 日报智能继承（Section 35）：三种继承模式，结构化条目快照复用 `DailyLog.items`，昨日内容自动填充
- 模板库交互优化（Section 38）：拖拽归类、右键菜单、变量编辑左右分栏 + 点击定位

**待实施：**
- 周报/月报自动汇总
- AI 语音输入 + NLP 语义解析
- OCR 证件识别
- 配置化变量映射引擎

- AI 智能驱动（Section 33）：
  - 语音输入：对接阿里云/腾讯云 ASR，浏览器端 MediaRecorder 采集
  - NLP 语义解析：利用现有 DeepSeek API，专用 prompt 提取结构化数据
  - OCR 证件识别：百度/阿里云 OCR 识别身份证、驾驶证、合格证
  - 自动归档：OCR 结果自动写入 Worker/Certificate/Equipment 表
- 配置化变量映射引擎（Section 34）：
  - 模板解析器：提取占位符 + 标准化 + 别名匹配
  - 变量字典：所有可用变量的注册中心，含中文标签和数据来源
  - 映射配置器：可视化绑定界面，自动匹配 80%+ 变量
  - 渲染引擎：改造 generate.service.ts，从 MappingConfig 读映射
- 日报智能继承（Section 35）：
  - 数据快照模型：生成日报时保存结构化条目快照
  - 两种继承模式：一键全量复制 / 选择性勾选复用
  - 周报双重继承：本周数据自动聚合 + 遗留问题跨周期继承
- 双通道输入设计（Section 36）：
  - 语音为主通道，键盘为兜底
  - 无 AI 时结构化日报表单自动接管
  - 两条路径同一终点：写入相同数据库 → 生成相同 Word

**验证结果：** 待实施后填写。

---

## 三十八、模板库交互优化（拖拽归类 + 右键菜单 + 变量编辑左右分栏 + 批量删除 + 编辑器变量侧边栏）

> 触发原因：模板库缺乏文件夹操作功能（拖拽归类、右键菜单），文档变量编辑需切换标签页效率低。用户期望拖拽卡片到分类完成归类，以及变量编辑时左右分栏"所见即所得"。
> 状态：**已实施（v4.1.0）。**

### 38.1 模板拖拽归类

**功能：** 模板列表中的卡片支持拖拽到左侧分类树任意节点，完成 `categoryId` 批量更新。

**交互逻辑：**
1. 模板卡片 `draggable=true`，`onDragStart` 时设置 `dataTransfer` 携带选中模板 ID 列表（JSON 格式）
2. 如果拖拽的是已选中卡片，则一次拖拽移动所有选中的模板
3. 分类树节点 `onDragOver` 阻止默认行为并显示蓝色高亮反馈（`ring-2 ring-blue-400 bg-blue-100`）
4. `onDrop` 时解析 `application/template-ids`，调用 `templateRepo.update` 逐条更新 `categoryId`
5. 拖拽完成后 toast 提示移动数量，清空选中状态，刷新分类树计数

**同时保留：** 顶部工具栏「批量移动」按钮 + `MoveCategoryDialog` 对话框作为非拖拽操作路径。

### 38.1.1 批量删除

**功能：** 勾选多个模板后，顶部工具栏显示「批量删除」按钮，支持一键删除所有选中模板。

**交互逻辑：**
1. 选中 ≥1 个模板后，工具栏出现红色「批量删除」按钮（`text-red-600 border-red-200 hover:bg-red-50`）
2. 点击弹出 `confirm` 确认框，提示删除数量和不可恢复
3. 确认后将所有选中 ID 加入 `deletingIds`（UI 即时灰显），清空 `selectedIds`
4. 逐条调用 `templateService.remove(id)`，失败不阻塞后续删除
5. 完成后 toast 显示成功/失败数量

### 38.2 分类树右键菜单

**功能：** 分类树节点（非内置分类）支持右键弹出上下文菜单，包含「新建子分类」「重命名」「删除」三项操作。

**交互逻辑：**
1. 分类树节点绑定 `onContextMenu`，`e.preventDefault()` 阻止浏览器默认菜单
2. 记录鼠标位置 `{ x: clientX, y: clientY }` 和目标节点 `CategoryRecord`
3. 渲染 `fixed` 定位的浮动菜单（`z-[100]`，白底圆角阴影）
4. 点击菜单项执行对应操作（新建子分类/重命名/删除），自动关闭菜单
5. 点击菜单外部或按 Escape 关闭（`useEffect` 监听 `document.click` 和 `document.contextmenu`）
6. 内置分类（`isBuiltIn`）不弹出右键菜单，保护和删除按钮仍常驻

### 38.3 变量编辑左右分栏

**功能：** 将原有三标签页（变量映射/文档预览/变量预览）替换为左右分栏布局，左侧文档预览、右侧变量配置，同屏可见。

**布局设计：**
- 对话框宽度从 `max-w-[520px]` 扩展到 `max-w-[960px]`（通过 `Sheet` 新增的 `className` prop）
- 左侧：文档预览区（`flex-1`），使用 mammoth 渲染 docx 为 HTML，变量 `{{变量名}}` 自动包裹为可点击的紫色标签（`var-tag`）
- 右侧：变量配置面板（`w-[340px] flex-shrink-0`），顶部搜索框 + 未映射统计，下部 `VariableMappingEditor` 流式列表

**点击定位（双向导航）：**
1. 文档预览区 `onClick` 事件委托，检测 `.var-tag` 元素
2. 点击变量标签 → 读取 `data-varname` → 调用 `scrollToVariable()` → 右侧 `VariableMappingEditor` 中对应变量行 `ref` 滚动到视口中心（`scrollIntoView({ behavior: 'smooth', block: 'center' })`）
3. 被定位的变量行突出显示（`ring-2 ring-purple-400 bg-purple-50/50`）

**实现细节：**
- mammoth 渲染 docx 后，对 HTML 做正则替换 `/\{\{([^}]+)\}\}/g`，将变量名包裹为 `<span class="var-tag" data-varname="..." style="...">`
- `VariableMappingEditor` 新增 `activeVariable` 和 `variableRefs` props，每行 `ref` 注册到 `useRef<Map<string, HTMLDivElement>>`
- `Sheet` 组件新增 `className` 可选 prop，允许外部覆盖默认 `max-w-[520px]`

### 38.5 Docx 编辑器变量侧边栏

**功能：** 将变量编辑面板直接集成到 docx 编辑器右侧边栏，无需跳转到独立弹窗即可配置变量映射。

**交互逻辑：**
1. 编辑器顶部工具栏新增「变量」切换按钮（`PanelRightOpen`/`PanelRightClose` 图标）
2. 点击后右侧滑出 `w-[380px]` 变量配置面板，包含 `VariableMappingEditor` 完整功能
3. 面板与编辑器左右分栏（`flex` 行），编辑器占 `flex-1`，面板固定宽度可关闭
4. 变量映射数据随模板加载时自动读取（`setVariableMappings(t.variableMappings ?? [])`）
5. 保存文档时一并写入 `variableMappings` 到 IndexedDB（`templateRepo.update`）
6. 面板关闭时映射数据不丢失，保持在 `variableMappings` 状态中

**与 38.3 的关系：** 38.3 的变量编辑左右分栏对话框（`VariableMappingSheet`）作为模板库列表页的快捷入口保留，38.5 的编辑器侧边栏是进入 docx 编辑器后的主要编辑路径。两者共用 `VariableMappingEditor` 组件。

### 38.4 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/components/ui/sheet.tsx` | 新增 `className` prop，透传到容器 div |
| `src/components/business/CategoryTree.tsx` | 新增 `onDropTemplate` prop；新增 `dragOverId`/`contextMenu` 状态；添加 `onDragOver`/`onDragLeave`/`onDrop`/`onContextMenu` 事件处理；渲染右键菜单浮动 UI |
| `src/pages/templates/components/TemplateCard.tsx` | 新增 `onDragStart` prop；Card 组件添加 `draggable` 和 `onDragStart` 属性 |
| `src/pages/templates/components/TemplateList.tsx` | 新增 `onDragStart` prop；透传给每个 `TemplateCard` |
| `src/pages/templates/components/TemplateToolbar.tsx` | 新增 `onBatchDelete` prop；添加红色「批量删除」按钮（`Trash2` 图标） |
| `src/pages/templates/TemplateLibraryPage.tsx` | 新增 `handleDragStart`（设置 dataTransfer）、`handleDragMove`（调用 templateRepo.update）和 `handleBatchDelete`（逐条删除 + toast 统计）；传递 `onDragStart` 给 `TemplateList`、`onDropTemplate` 给 `CategoryTree`、`onBatchDelete` 给 `TemplateToolbar` |
| `src/pages/templates/components/VariableMappingSheet.tsx` | 重构为左右分栏布局；mammoth 渲染文档预览并标注可点击变量；新增 `scrollToVariable` 和 `handleDocClick`；移除三标签页切换 |
| `src/components/business/VariableMappingEditor.tsx` | 新增 `activeVariable` 和 `variableRefs` props；每行 ref 注册 + 高亮样式 |
| `src/pages/editor/DocxEditorPage.tsx` | 新增变量侧边栏：`showVariablePanel` 状态 + 「变量」切换按钮 + `VariableMappingEditor` 右侧面板；加载/保存时读写 `variableMappings` |

---

## 三十九、产品体验优化（v4.1.1）

> 触发原因：用户测试反馈 5 项交互缺陷和功能缺失。
> 状态：**已实施（v4.1.1）。**

### 39.1 移除冗余「文档编辑器」导航入口

**问题：** 侧边栏「智能工具」分组下存在独立的「文档编辑器」菜单项，点击后显示"即将上线"占位页。实际编辑功能已通过模板库「在线编辑」按钮进入 `/editor/docx` 和 `/editor/xlsx`。

**修改：**
- 从 `menu.tsx` 中移除 `docx-editor` 菜单项
- 从 `AppLayout.tsx` 面包屑映射中移除 `editor` 条目
- `/editor` 路由改为重定向到 `/templates`

### 39.2 日报模板选择：下拉改弹窗

**问题：** 日报填写页使用原生 `<select>` 选择模板，模板多时下拉过长影响操作效率。

**修改：**
- 新增 `TemplateSelectDialog` 组件（`src/components/business/TemplateSelectDialog.tsx`）
- 使用 Sheet 弹窗展示模板列表，支持搜索过滤，选中高亮
- `DailyReportPage.tsx` 中替换 `<select>` 为按钮（显示当前选中模板名） + 弹窗选择

### 39.3 文件夹新建/删除功能可见性增强

**问题：** 分类树已有新建/删除功能，但新建按钮被滚动到底部，用户不易发现。

**修改：**
- 分类树顶部标题栏新增「新建分类」加号按钮（`Plus` 图标）
- 底部「新建分类」按钮改为 sticky 固定在分类树底部（`border-t` 分隔线）
- 确保内置分类的操作按钮始终可见

### 39.4 Excel 编辑器变量编辑侧边栏

**问题：** Excel 编辑器打开后缺少变量编辑功能入口，与 Word 编辑器体验不一致。

**修改：**
- `XlsxEditorPage.tsx` 新增 `showVariablePanel` 状态和「变量」切换按钮
- 右侧 `w-[380px]` 变量配置面板，内嵌 `VariableMappingEditor`
- 加载模板时读取 `variableMappings`，保存时一并写入 IndexedDB
- 与 `DocxEditorPage.tsx` 完全一致的布局和交互

### 39.5 变量编辑：一键映射 + 自动中文化

**问题：** 
- A. 用户选择「项目字段」后还需二次选择具体字段，操作路径过长
- B. 变量名称仍显示英文（如 `projectName`），未落实中文化承诺

**修改：**
- `VariableMappingEditor.tsx` 新增 `EXPANDED_SOURCE_OPTIONS`：将项目字段和扩展字段直接嵌入来源下拉框，按分组显示（如「项目字段 - 项目基础信息 - 项目名称」），实现**一键映射**，无需二次选择
- 新增 `parseSourceValue()` / `buildSourceValue()` 辅助函数，封装 `field:xxx` 值的解析和构建
- 映射到具体字段时自动设置中文标签（`label` 字段），确保前端显示全中文
- 移除旧的 `SOURCE_OPTIONS` 和独立的 field/extraField 二级下拉框

### 39.6 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/config/menu.tsx` | 移除「文档编辑器」菜单项和 `PenLine` 图标导入 |
| `src/App.tsx` | `/editor` 路由改为重定向到 `/templates` |
| `src/components/layout/AppLayout.tsx` | 面包屑映射移除 `editor` 条目 |
| `src/components/business/TemplateSelectDialog.tsx` | **新增**：日报模板选择弹窗（Sheet 布局，搜索过滤，选中高亮） |
| `src/pages/report/DailyReportPage.tsx` | `<select>` 替换为按钮 + TemplateSelectDialog 弹窗选择 |
| `src/components/business/CategoryTree.tsx` | 顶部新增「新建分类」按钮；底部新建按钮改为 sticky 固定 |
| `src/pages/editor/XlsxEditorPage.tsx` | 新增变量编辑侧边栏（「变量」按钮 + `VariableMappingEditor` 右侧面板）；加载/保存读写 `variableMappings` |
| `src/components/business/VariableMappingEditor.tsx` | 重构来源选择：`EXPANDED_SOURCE_OPTIONS` 实现一键映射；自动设置中文标签；移除旧的 `SOURCE_OPTIONS` 和二级下拉框 |

---

## 四十、Bug 修复与功能补全（v4.1.2）

> 触发原因：用户测试发现 5 项交互缺陷和功能缺失。
> 状态：**待实施。**

### 40.1 新建分类未在"全部模板"列表下方显示

**问题：** 用户在分类树中创建新分类后，分类未出现在"全部模板"下方的树节点列表中。

**根因：** 分类树 `tree` 数据由父组件 `TemplateLibraryPage` 调用 `loadCategories` 传入。`confirmCreate` 已调用 `load()` 刷新本地数据，但需确认 `categoryRepo.createCustom` 创建的根级自定义分类（`parentId: null`）是否被 `buildTree` 正确包含在根节点数组中。

**修复方案：**
- 检查 `categoryRepo.list()` → `buildTree()` 的数据流，确保 `parentId: null` 的非内置分类出现在根级 `tree` 数组中
- 修复后 `TemplateLibraryPage` 的 `loadCategories` 应能正确拿到包含新分类的完整树

**验收标准：** 创建分类后立即在"全部模板"下方看到新分类节点；刷新页面后分类仍存在。

### 40.2 变量配置面板英文残留

**问题：** 变量配置面板中部分文本仍为英文，未完成全量中文化。

**根因：** 两处英文残留：
- [VariableMappingEditor.tsx](file:///f:/安全管理平台/src/components/business/VariableMappingEditor.tsx#L234)：`placeholder="如 workerList、hazardList"` — 英文示例混用
- [VariableMappingEditor.tsx](file:///f:/安全管理平台/src/components/business/VariableMappingEditor.tsx#L184)：`{{m.name}}` 模板写法直接暴露英文变量名（如 `projectName`），虽然 `m.label` 优先显示，但 `{{}}` 包裹的原始名仍为英文

**修复方案：**
- 替换 `placeholder="如 workerList、hazardList"` 为 `placeholder="如：人员列表、隐患列表"`
- 将 `{{m.name}}` 改为 `{{m.label || m.name}}`，优先显示中文标签

**验收标准：** 变量配置面板中无任何英文文本；模板写法 `{{xxx}}` 显示中文变量名。

### 40.3 Word 编辑器无限加载

**问题：** 打开 Word 模板后编辑器一直显示"正在加载..."，无法进入编辑状态。

**根因：** [DocxEditor.tsx](file:///f:/安全管理平台/src/components/editors/DocxEditor.tsx#L48-L50) 中 `loading` 状态初始化为 `true`，但 `EigenpalDocxEditor` 组件加载完成后没有触发 `onReady` 回调将 `loading` 设为 `false`。

**修复方案：**
- 查找 `@eigenpal/docx-editor-react` 的 `onReady`/`onLoad` 回调 API
- 在回调中调用 `setLoading(false)`
- 如果库不支持，使用 `setTimeout` 兜底方案：在 `documentBuffer` 非空后延迟 500ms 自动解除 loading

**验收标准：** 打开 Word 模板后 loading 在 2 秒内消失，编辑器正常显示可编辑内容。

### 40.4 光标插入变量不可用 + 缺少操作指引

**UX 痛点：** 用户在 Word 编辑器中输入报告时，想插入变量 `{{项目名称}}`，但不知道如何操作。当前变量面板只显示"映射配置"，缺少"插入变量到文档"的按钮和操作提示。

**根因：**
- `DocxEditor` 组件只暴露了 `save()` 接口，没有 `insertText(text: string)` 方法
- `VariableMappingEditor` 每行变量没有「插入到文档」按钮
- 变量面板顶部缺少操作指引

**修复方案：**
1. 在 `DocxEditor` 的 `useImperativeHandle` 中新增 `insertText(text: string)` 方法：通过 `editorRef.current` 的底层 API 或 `document.execCommand('insertText')` 在光标位置插入文本
2. 在 `VariableMappingEditor` 每行变量右侧新增「插入」按钮（`Plus` 图标，点击后调用 `onInsert?.(m.name)` 回调）
3. 在变量面板顶部添加一行提示文字："点击变量右侧的「插入」按钮，将变量插入到文档光标位置"
4. `DocxEditorPage` 接收 `onInsert` 回调，调用 `editorRef.current.insertText(`{{${name}}}`)`

**验收标准：** 变量面板每个变量行有「插入」按钮；点击后文字 `{{变量名}}` 出现在文档光标位置；面板顶部有操作提示。

### 40.5 Excel 变量面板缺少操作按钮

**UX 痛点：** 用户打开 Excel 模板的变量面板，只看到变量映射列表，没有"添加变量"、"删除"、"插入"等操作按钮，无法进行变量的增删改查操作。

**根因：** `VariableMappingEditor` 组件设计为纯映射列表，不支持：
- 新增变量
- 删除变量
- 插入变量到文档

**修复方案：**
1. 在变量列表顶部添加「添加变量」按钮（`Plus` 图标），点击后在列表末尾新增一行空白变量（`source: 'manual'`, `name: ''`, `label: ''`）
2. 在每行变量右侧添加「删除」按钮（`Trash2` 图标，点击后从 `items` 中移除该行）
3. 同 40.4，每行变量新增「插入」按钮
4. 变量名称列改为可编辑的 `Input`（当 `name` 为空时），方便用户自定义变量名

**验收标准：** 变量面板顶部有「添加变量」按钮；每行有「删除」和「插入」按钮；可新增自定义变量并删除；新增变量保存后持久化。

### 40.6 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/components/business/CategoryTree.tsx` | 修复 `buildTree` 逻辑，确保 `parentId: null` 的自定义分类在根节点数组中 |
| `src/components/business/VariableMappingEditor.tsx` | 替换英文 placeholder；`{{m.name}}` 改为 `{{m.label \|\| m.name}}`；新增「添加变量」按钮；每行新增「插入」和「删除」按钮；新增 `onInsert` 回调；变量名支持编辑 |
| `src/components/editors/DocxEditor.tsx` | 新增 `insertText()` 方法到 `useImperativeHandle`；修复 loading 无法解除的问题（添加 `onReady` 回调或兜底 timer） |
| `src/pages/editor/DocxEditorPage.tsx` | 接收 `onInsert` 回调并调用 `editorRef.current.insertText()` |
| `src/pages/editor/XlsxEditorPage.tsx` | 与 DocxEditorPage 保持一致（变量面板已集成，无需额外修改） |

---

## 四十一、关键 Bug 修复（v4.1.3）

> 触发原因：用户测试发现 Word 编辑器首次加载无限 loading、插入变量不可用、变量面板默认值框作用不明确。
> 状态：**已实施（v4.1.3）。**

### 41.1 Word 编辑器首次加载无限 loading（刷新后才正常）

**问题：** 首次打开 Word 模板时编辑器一直显示"正在加载 Word 编辑器"，刷新页面后恢复正常。

**根因：** `DocxEditor` 组件中 `loading` 状态初始化为 `true`，依赖 `onFontsLoaded` 回调设为 `false`。但当 `documentBuffer` 变化时（如从模板列表点击进入），`loading` 不会重置为 `true`，导致竞态条件：`onFontsLoaded` 在 `loading` 被下游消费前就已触发，UI 永远停留在 loading 状态。

**修复：** 在 `DocxEditor` 中新增 `useEffect`，监听 `documentBuffer` 变化，变化时重置 `loading = true`，确保每次打开新模板都走完整的 loading → ready 流程。

### 41.2 插入变量到文档功能不可用

**问题：** 变量面板上的「插入」按钮（PlusCircle 图标）点击后，变量如 `{{projectName}}` 未出现在 Word 文档中。

**根因：** `insertText` 方法中的 DOM 降级策略不够健壮——`document.execCommand('insertText')` 需要编辑器可编辑区域先获得焦点，且延迟时间不足。

**修复：** 重构 `insertText` 三级降级策略：
1. 优先调用编辑器 API（`editor.insertText()`）
2. 次选调用底层编辑器实例（`editor.getEditor().insertText()`）
3. 兜底：聚焦 `.docx-editor-container` 内的 `[contenteditable="true"]` 元素，延迟 50ms 后执行 `document.execCommand('insertText', false, text)`

### 41.3 变量面板默认值框显示不全且作用不明确

**问题：** 变量配置面板中"默认值 / 说明"列的输入框宽度不足，且缺少标签说明其用途，用户不清楚该填什么。

**修复：**
- 移除冗余的「状态」列（绿/红圆点），释放一列空间
- 默认值列宽度从 `col-span-3` 扩大到 `col-span-4`
- 新增 `label` 标签说明：`"默认值（生成时自动填入）"` / `"自动填充（不可手动修改）"`
- 优化 placeholder 文案：`"填写后生成报告时自动使用此值"` / `"来自系统数据，无需填写"`
- 必填 checkbox 添加 `title="设为必填变量"` 提示

### 41.4 变量添加操作指南

**向 Word/Excel 文档添加变量的完整步骤：**

1. **打开模板**：在模板库中点击一个 .docx 或 .xlsx 模板，进入在线编辑器
2. **打开变量面板**：点击编辑器顶部工具栏的「变量」按钮，右侧弹出变量配置面板
3. **添加变量**（两种方式）：
   - **方式一**：点击面板顶部「添加变量」按钮，新增一行空白变量，输入变量名（如 `施工单位`），设置数据来源和默认值
   - **方式二**：模板导入时自动解析 Word 文档中的 `{{变量名}}` 占位符，自动显示在面板中
4. **插入到文档**：在编辑器中点击要插入变量的位置，然后点击变量行右侧的蓝色「+」按钮，变量 `{{变量名}}` 即出现在光标位置
5. **保存**：点击「保存」按钮，变量映射和文档内容同步写入 IndexedDB

### 41.5 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/components/editors/DocxEditor.tsx` | 新增 `useEffect` 监听 `documentBuffer` 重置 loading；重构 `insertText` 三级降级策略（API → execCommand → 聚焦） |
| `src/components/business/VariableMappingEditor.tsx` | 移除状态圆点列；默认值列从 `col-span-3` 扩大为 `col-span-4`；添加标签说明和优化 placeholder；必填 checkbox 添加 title 提示 |

---

## 四十二、关键 Bug 修复（v4.1.4）

> 触发原因：v4.1.3 的 `execCommand` 降级策略在 ProseMirror 编辑器中完全无效，导致变量无法插入到 Word/Excel 文档。
> 状态：**已实施（v4.1.4）。**

### 42.1 insertText 彻底失效：execCommand 对 ProseMirror 无效

**问题：** v4.1.3 实施的 `insertText` 三级降级策略（API → getEditor → execCommand）中，前两级因为 Eigenpal 编辑器不暴露 `insertText` API 而静默跳过，第三级 `document.execCommand('insertText')` 对 ProseMirror 渲染的 contenteditable 区域同样无效——ProseMirror 接管了所有输入事件，`execCommand` 无法绕过其事务系统。

**根因：** Eigenpal 编辑器基于 ProseMirror 构建，所有文档变更必须通过 `EditorState.tr` 事务系统。`DocxEditorRef` 通过 `getEditorRef()` 返回 `PagedEditorRef`，后者暴露了 `getState()`、`dispatch(tr)` 和 `focus()` 等 ProseMirror 原生接口，但之前的代码没有利用这些接口。

**修复：** 将 `insertText` 方法改为 ProseMirror 原生方案：

```typescript
insertText: (text: string) => {
  const editorInner = editorRef.current?.getEditorRef?.()
  if (editorInner) {
    editorInner.focus()
    const state = editorInner.getState()
    if (state) {
      const tr = state.tr.insertText(text)  // ProseMirror Transaction.insertText
      editorInner.dispatch(tr)
      onChange?.()
      return
    }
  }
  // 兜底：execCommand（仅对非 ProseMirror 环境）
  try { document.execCommand('insertText', false, text); onChange?.() } catch {}
}
```

**关键 API 链路：**
```
DocxEditorRef → getEditorRef() → PagedEditorRef
  ├── getState() → EditorState → tr.insertText(text) → Transaction
  ├── dispatch(tr) → 执行事务
  └── focus() → 聚焦编辑器
```

### 42.2 Excel 变量面板按钮缺失（已确认代码正确）

**问题：** 用户反馈 Excel 编辑器中变量面板完全没有操作按钮。

**排查结果：** [XlsxEditorPage.tsx](file:///f:/安全管理平台/src/pages/editor/XlsxEditorPage.tsx) 代码审查确认：
- 工具栏「变量」按钮已正确渲染（第 149-158 行）
- `onInsert={handleInsertVariable}` 已正确传递到 `VariableMappingEditor`（第 200 行）
- `handleInsertVariable` 使用 `navigator.clipboard.writeText()` 将变量复制到剪贴板（第 30-35 行），因为 Excel 的 Univer 编辑器不支持光标位置插入

**结论：** 代码层面已正确。用户需重启 dev server 以加载最新构建。

### 42.3 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/components/editors/DocxEditor.tsx` | 重构 `insertText`：从 execCommand 降级改为 ProseMirror `state.tr.insertText()` 原生方案 |
| `src/pages/editor/XlsxEditorPage.tsx` | 确认代码正确（工具栏变量按钮、onInsert 回调、handleInsertVariable 均已就位） |

---

## 四十三、变量面板 + 分类管理深度重构（v4.2.0）

> 触发原因：变量输入失焦、分类需手动刷新、长列表无虚拟化、分类缺少拖拽排序。
> 状态：**已实施（v4.2.0）。**

### 43.1 变量输入防抖提交 + 稳定 key

**问题：** 每次按键触发 `onChange` → 父组件重渲染 → `mappings` prop 变化 → `useEffect` 覆盖 `items` → React 检测到 key 变化（`${m.name}-${index}` 因 name 变化而改变）→ 卸载并重建整个 Input 组件 → 焦点丢失。

**修复：**
- 每次 `addVariable()` 生成 `_localId: crypto.randomUUID()`，作为稳定 key
- `updateItem` 改为防抖模式：本地立即更新 state，500ms 静默后批量通知父组件
- 组件卸载时立即 flush 未提交的变更
- 点击「插入」按钮时，flush 后再执行插入操作

**关键代码：**
```typescript
// 防抖提交
const debounceRef = useRef<ReturnType<typeof setTimeout>>()
const updateItem = (index: number, patch: Partial<VariableMapping>) => {
  setItems((prev) => {
    const next = prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChangeRef.current?.(next), 500)
    return next
  })
}

// 稳定 key
const stableKey = (m as LocalVariable)._localId ?? `var-${originalIndex}`
```

### 43.2 CategoryTree 改为 liveQuery 驱动

**问题：** `CategoryTree` 内部通过 `load()` + `refreshKey` 手动管理数据，增删改后需要调用 `setTreeRefreshKey(k => k + 1)` 触发刷新。与 `useTemplateLibrary` 中的 `useLiveQuery` 各自独立查询 IndexedDB，数据不一致。

**修复：**
- `CategoryTree` 不再内部 `load()`，改为接收 `tree` 和 `templateCounts` 作为 props
- `useTemplateLibrary` 中新增 `templateCounts`（从 liveQuery 的 templates 数据用 `useMemo` 计算）
- `TemplateLibraryPage` 移除 `treeRefreshKey` 和所有 `setTreeRefreshKey` 调用
- `useLiveQuery` 自动监听 IndexedDB 变更，任何增删改立即反映到 UI

**数据流：**
```
IndexedDB 变更 → useLiveQuery 检测 → useTemplateLibrary 更新
  ├── categoryTree → CategoryTree props
  ├── templateCounts → CategoryTree props
  └── templates → 模板列表自动刷新
```

### 43.3 变量名完整展示（tooltip）

**修复：**
- 变量名列添加 `title` 属性，显示完整变量名、中文名和模板写法
- 变量名字符限制从 `truncate` 改为 `max-w-[120px] truncate`，超出 120px 截断但 hover 显示完整信息
- 模板写法行也添加 `title` 属性

### 43.4 分类拖拽排序 + 自定义确认弹窗

**新增功能：**
- 每个分类行添加 `draggable` + `GripVertical` 拖拽手柄（hover 时显示）
- 拖拽时分三种落点：`before`（上方蓝色顶线）、`after`（下方蓝色底线）、`inside`（移入子分类）
- 排序后通过 `categoryRepo.updateSortOrder()` 持久化
- 移入子分类时通过 `categoryRepo.update(parentId)` 持久化

**自定义确认弹窗：**
- 替代原生 `confirm()`，使用 `AlertTriangle` 图标 + 红色确认按钮的模态弹窗
- 支持 `canDelete` 检查结果，显示子模板数量警告

### 43.5 变量列表虚拟滚动

**新增依赖：** `@tanstack/react-virtual`

**实现：**
- 变量列表容器固定高度（`flex-1 overflow-y-auto`），内部使用 `useVirtualizer`
- 每行预估高度 80px，`overscan: 5`
- 可视区外 DOM 节点自动卸载，支持 100+ 变量流畅滚动
- 动态行高：通过 `measureElement` ref 自动测量实际行高

### 43.6 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/components/business/VariableMappingEditor.tsx` | 防抖提交 + 稳定 `_localId` key + 虚拟滚动 + 变量名 tooltip |
| `src/components/business/CategoryTree.tsx` | 完全重写：props 驱动（tree + templateCounts）+ 拖拽排序 + 自定义确认弹窗 |
| `src/pages/templates/TemplateLibraryPage.tsx` | 移除 `treeRefreshKey`；传递 `tree` + `templateCounts` 到 CategoryTree |
| `src/pages/templates/hooks/useTemplateLibrary.ts` | 新增 `templateCounts` 计算和导出 |
| `package.json` | 新增依赖 `@tanstack/react-virtual` |

---

## 四十四、变量输入失焦 + 分类树不刷新修复（v4.2.1）

> 触发原因：v4.2.0 的防抖提交未解决父组件重渲染导致的本地状态覆盖问题；分类操作后 useLiveQuery 未自动刷新。
> 状态：**已实施（v4.2.1）。**

### 44.1 变量输入失焦：父组件重渲染覆盖本地状态

**根因：** 虽然 v4.2.0 的防抖提交延迟了 `onChange` 通知父组件，但 `DocxEditorPage` 中 `DocxEditor` 的 `onChange` 回调（`setDirty(true)`）会在每次编辑器交互时触发父组件重渲染。每次重渲染都创建新的 `variableMappings` 数组引用，导致 `VariableMappingEditor` 的 `useEffect([mappings])` 将本地 `items` 状态覆盖为父组件的原始值。

**修复：** 将 `useEffect` 的同步逻辑从引用比对改为内容比对：

```typescript
const lastSyncedRef = useRef<string>('')

useEffect(() => {
  const serialized = JSON.stringify(mappings ?? [])
  if (serialized !== lastSyncedRef.current) {
    lastSyncedRef.current = serialized
    setItems((mappings ?? []) as LocalVariable[])
  }
}, [mappings])
```

仅当 `mappings` 的序列化内容实际变化时（如模板初次加载、保存后重新加载），才同步到本地状态。父组件因编辑器交互触发的重渲染（`mappings` 内容未变）不再覆盖本地编辑。

### 44.2 分类树操作后不刷新

**根因：** `useLiveQuery` 的 `deps` 为 `[]`，订阅创建后永不重建。虽然 `liveQuery` 理论应检测 IndexedDB 变更，但在某些情况下（如 `getTree()` 的复杂内存处理）可能未正确触发。

**修复：** 引入 `treeVersion` 手动刷新机制：

- `useTemplateLibrary` 新增 `treeVersion` 状态和 `refreshTree` 回调
- `useLiveQuery` 的 `deps` 改为 `[treeVersion]`，每次 `treeVersion` 变化时重建订阅
- `CategoryTree` 新增 `onTreeMutated` 回调，在所有增删改操作完成后调用
- `TemplateLibraryPage` 将 `refreshTree` 传递给 `CategoryTree` 的 `onTreeMutated`

**数据流：**
```
CategoryTree 操作完成 → onTreeMutated() → refreshTree()
  → treeVersion++ → useLiveQuery 重建订阅 → getTree() 重新执行 → categoryTree 更新
```

### 44.3 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/components/business/VariableMappingEditor.tsx` | `useEffect([mappings])` 从引用比对改为 JSON 内容比对，防止父组件重渲染覆盖本地编辑 |
| `src/components/business/CategoryTree.tsx` | 新增 `onTreeMutated` prop；在 create/rename/delete/drag 操作成功后调用 |
| `src/pages/templates/hooks/useTemplateLibrary.ts` | 新增 `treeVersion` 状态 + `refreshTree` 回调；`useLiveQuery` deps 改为 `[treeVersion]` |
| `src/pages/templates/TemplateLibraryPage.tsx` | 解构 `refreshTree`；传递给 `CategoryTree` 的 `onTreeMutated` |

---

## 四十五、分类树 + 变量输入 + 字段插入三重修复（v4.2.2）

> 触发原因：v4.2.1 的 JSON 内容比对和 useLiveQuery 依赖 treeVersion 未彻底解决问题。
> 状态：**已实施（v4.2.2）。**

### 45.1 分类树新建不显示：useLiveQuery → useState+useEffect

**根因：** `useLiveQuery` 的 `deps` 为 `[treeVersion]` 时，订阅重建机制不可靠——`useMemo` 和 `useEffect` 的依赖追踪在 `dexie-react-hooks` v1.1.7 中可能存在时序问题，导致 `getTree()` 未在 `treeVersion` 变化后重新执行。

**修复：** 完全放弃 `useLiveQuery` 管理分类树，改用 `useState` + `useEffect` 手动刷新：

```typescript
const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([])

useEffect(() => {
  categoryRepo.getTree().then(setCategoryTree)
}, [treeVersion])
```

`treeVersion` 变化时，`useEffect` 重新执行，`getTree()` 返回最新数据，`setCategoryTree` 触发重渲染。机制简单可靠，不依赖第三方库的订阅行为。

### 45.2 变量输入仍失焦：移除 useEffect 同步，改用 key 重挂载

**根因：** 即使加了 JSON 内容比对，`useEffect([mappings])` 在父组件因 `setDirty(true)` 重渲染时仍会执行（因为 `mappings` 引用未变时 `Object.is` 为 true，理论上不应执行，但 React 的批次更新和并发模式可能导致意外行为）。更根本的问题是：受控组件模式（props → state 同步）对于编辑器内嵌面板是天然不稳定的。

**修复：** 将 `VariableMappingEditor` 从受控模式改为非受控模式：

- [VariableMappingEditor.tsx](file:///f:/安全管理平台/src/components/business/VariableMappingEditor.tsx)：移除 `useEffect([mappings])` 同步逻辑，改用 `useState(() => (mappings ?? []) as LocalVariable[])` 初始化本地状态
- [DocxEditorPage.tsx](file:///f:/安全管理平台/src/pages/editor/DocxEditorPage.tsx)：添加 `key={template?.id}`，切换模板时自动重挂载（重新初始化状态）

**关键变化：**
```
之前：mappings prop → useEffect 同步 → items state（每次父组件渲染都可能覆盖）
之后：mappings prop → useState 初始化（仅挂载时）→ items state（完全自主管理）
```

组件通过 `onChange` 回调通知父组件，父组件重渲染不再影响组件内部状态。

### 45.3 插入字段显示旧字符：label||name + 自动填充 name

**根因：** 插入按钮调用 `handleInsert(m.name)`，但选择项目字段时只设置了 `label`（中文名），未设置 `name`（变量名）。导致 `m.name` 为空时插入 `{{新变量}}` 而非 `{{项目名称}}`。

**修复：**
- 插入按钮改为 `handleInsert(m.label || m.name)`，优先使用中文标签
- 选择字段时自动填充 `name`：`if (!m.name) patch.name = parsed.field`
- 禁用条件改为 `(!m.name && !m.label)`，允许仅设 label 时也能插入

### 45.4 修改文件清单

| 文件 | 修改说明 |
|------|--------|
| `src/pages/templates/hooks/useTemplateLibrary.ts` | `useLiveQuery` 改为 `useState`+`useEffect` 管理分类树 |
| `src/components/business/VariableMappingEditor.tsx` | 移除 `useEffect([mappings])`；`useState` 初始化替代同步；insert 使用 `label\|\|name`；选择字段时自动填充 `name`；disabled 条件改为 `!name && !label` |
| `src/pages/editor/DocxEditorPage.tsx` | `VariableMappingEditor` 添加 `key={template?.id}` |

---
