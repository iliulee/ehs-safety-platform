# 溜哥的安全管理平台 — 项目开发规范（PROJECT_SPEC）

> 本文档是项目开发的唯一权威规范。任何开发行为必须严格遵循本文档。
> 最后更新：2026-07-08 v4.0（重构为独立 Electron 桌面应用：品牌升级、UI 重设计、docx-editor + Univer Sheets 集成）

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
| AI接口 | OpenAI兼容Fetch API | - | 支持DeepSeek/通义千问/GPT/本地模型 |
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

### 12.4 本地知识库RAG方案写作（可落地）

**场景**：用户写安全专项方案时，需要参考已有的规范、历史方案、标准范本，AI可以基于本地知识库帮助生成符合规范的方案文本。

#### 12.4.1 技术选型（桌面应用端可落地）

考虑到是纯前端桌面应用（没有后端），MVP阶段采用 **BM25关键词检索 + LLM生成** 方案：
- 不引入本地向量模型（embedding模型太大，首次加载几十MB到几百MB，桌面应用环境受限）
- 文档切分后存入IndexedDB，建立倒排索引
- 中文分词采用双字滑窗 + 安全领域专有名词词典
- 检索到相关片段后，拼接Prompt调用DeepSeek生成
- 后续可升级：接入阿里云灵积/DeepSeek Embedding API做向量检索重排序

#### 12.4.2 知识库构建

1. 用户在「知识库」页面上传规范文档（.docx/.pdf/.txt/.md）
2. text-extractor.service解析：
   - docx：用PizZip解析XML提取文本
   - pdf：用pdf.js提取文本
   - txt/md：直接读取
3. chunker.service按规则切分：
   - 优先按条款号（"第X条"、"X.X.X"、"（一）"、"1."）切分
   - 其次按段落（空行）切分
   - 目标长度300-500字，最大600字，相邻切片重叠80字
   - 每个chunk保留：docId、docTitle、chunkIndex、content、tokens、category
4. 存入IndexedDB的knowledge_documents和knowledge_chunks表
5. bm25.service为所有chunk建立倒排索引（内存Map + IndexedDB持久化）

#### 12.4.3 BM25检索策略

```typescript
// bm25.service.ts
async function search(query: string, topK: number = 5): Promise<Chunk[]> {
  // 1. 查询分词（双字滑窗 + 词典匹配 + 停用词过滤）
  const tokens = tokenize(query)
  // 2. 查倒排索引，获取候选chunk ID集合
  // 3. 对每个候选chunk计算BM25得分
  //    score(D,Q) = Σ IDF(qi) * f(qi,D) * (k1+1) / (f(qi,D) + k1*(1-b+b*|D|/avgdl))
  //    参数：k1=1.5, b=0.75
  // 4. 按得分排序返回topK
}
```

专有名词词典（80+安全工程术语）：脚手架、连墙件、刚性连接、扫地杆、剪刀撑、三级配电、临边防护、洞口作业、深基坑、降排水、监测预警等。

#### 12.4.4 AI写作流程

```
用户输入写作需求（如："写深基坑专项方案"）
  ↓
rag-knowledge.service.retrieve(query, topK=5)
  ↓
BM25检索返回Top-5相关切片
  ↓
拼接Prompt：
  system: 你是建筑施工安全专家。请严格根据以下参考资料撰写方案。
          要求：专业、规范、符合建筑行业标准。必须引用参考资料编号。
  user: [参考资料1]《JGJ180-2009》4.2.3条：...
        [参考资料2]《危大工程管理规定》：...
        请撰写：{{query}}
  ↓
调用DeepSeek Chat API流式输出
  ↓
显示参考资料列表 + [参考资料X]引用标注
  ↓
用户可一键复制生成内容，或直接插入到文档编辑器中。
```

#### 12.4.5 幻觉控制策略
- 所有生成必须基于检索到的本地文档片段，Prompt中明确要求"仅根据参考资料回答，不要自己编造"
- 生成后显示参考资料来源（文档标题、条款/切片编号）
- 如果检索结果为空，提示用户"知识库中未找到相关内容，是否基于通用知识生成？"
- 用户可以在设置中调整temperature（0.1-1.0，默认0.3）

#### 12.4.6 性能保证
- 1000个切片以内检索 < 50ms
- 导入100页文档 < 5秒（提取+切片+分词+入库）
- 删除文档时同步从内存索引和数据库中移除

### 12.5 涉及文件

```
src/
├── services/
│   ├── ai.service.ts                ← DeepSeek API调用封装（chat/vision/streaming）
│   ├── rag-knowledge.service.ts     ← RAG核心：导入/检索/删除/生成对话
│   ├── text-extractor.service.ts    ← docx/pdf/txt文本提取
│   ├── chunker.service.ts           ← 文本切片（按条款号/段落/长度）
│   └── bm25.service.ts              ← 中文分词 + BM25检索引擎
├── pages/
│   ├── knowledge/
│   │   └── KnowledgePage.tsx        ← 知识库管理（文件导入/文档删除/切片查看）
│   ├── ai/
│   │   └── AiChatPage.tsx           ← AI助手（RAG问答/流式输出/参考资料）
│   └── projects/
│       └── ProjectListPage.tsx      ← AI导入项目信息
├── components/business/
│   └── AiWritingPopover.tsx         ← AI写作输入/结果展示（预留）
└── db/repositories/
    ├── knowledge-doc.repo.ts        ← 知识库文档CRUD
    └── knowledge-chunk.repo.ts      ← 知识库切片CRUD
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
| 知识库RAG | ✅ | BM25检索引擎：文件导入→切片→分词→倒排索引→AI生成+参考资料标注 |
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
