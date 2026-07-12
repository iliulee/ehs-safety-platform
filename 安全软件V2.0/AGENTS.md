# AGENTS.md — 安全管理平台 AI 编码入口

> Trae 每次开新会话自动加载本文件。不要删除。

## 🎯 v6.0 MVP 切入口（2 天交付）

**目标**：以"安全施工日志"为引爆点，跑通最小可用闭环。

### MVP 三大能力

| 能力 | 选型 | 验证 | 状态 |
|------|------|------|------|
| 1. 身份证 OCR 自动填工人 | `tesseract.js` v7（37.4k dependents） | 拍照身份证 → 自动填入 workers 表 | ✅ 已安装 |
| 2. 设备铭牌 OCR | `tesseract.js` v7 + chi_sim | 拍照设备 → 识别编号 | ✅ 复用 |
| 3. AI 文字拆解 | OpenAI SDK + zod schema | 微信语音输入文字 → AI 拆解到各表 | ✅ 复用模块 2 |

**核心理念**：用现成库，不自研；用现有表，不新建；用 DailyReportPage，不做新页面。

### Day 1（今天）：OCR 接入
- `src/services/ocr.service.ts` 新建
- 工人页加"拍照录入身份证"入口
- 设备页加"拍照识别铭牌"入口
- tsc + vite build 门禁通过 → commit

### Day 2（明天）：AI 拆解 + 日志生成
- `src/services/ai-parser.service.ts` 新建（zod schema 约束）
- DailyReportPage 加"AI 拆解"按钮
- 拆解结果 → 写入对应业务表
- 一键生成当天的安全施工日志 Word
- tsc + vite build 门禁通过 → commit

### 暂不做（v6.0 范围外）
- 模板编辑器修复（已知 3 个 bug）
- 自然语言录入 UI（用微信输入法解决）
- 复杂排版/打印
- 多用户协作

### 禁止重写（v6.0 期间）
- docxtemplater / ExcelJS / Dexie.js / shadcn/ui / MiniSearch / mammoth / pdfjs-dist / **tesseract.js**
- 不动 src/pages/templates/（3 个 bug 还没修）
- 不动 v5.0 已完成的 4 个模块（分词 / AI 调用 / 切分 / 检索）

## ⚠️ 溜哥新建 Code 任务时的操作清单（每次必读）

新建 Code 任务时，必须确认以下 3 项，否则 Git 会丢：

1. **运行环境**：选 **本地**（本地电脑/DESKTOP-N7279TH），不要选"云端沙箱"或"Cloud Agent"
2. **工作目录**：`F:\安全管理平台`（不是 `安全软件V2.0`）
3. **沙箱外运行**：弹窗问"是否允许沙箱外运行"时，点 **是**

> 以上 3 项缺一不可。选错了 Git 提交会丢在沙箱里，本地仓库收不到。

## 启动指令（AI 必须执行）

打开本会话后，**立即**读取以下两个文件以获取完整上下文：

1. `PROJECT-new_SPEC.md` — 产品需求、功能定义、技术方案（权威规范）
2. `VIBE_CODING_PROMPT.md` — 编码规范、拼好码原则、质量门禁（工作手册）

## 一句话定位

溜哥（大理机场改扩建项目安全总监）的安全管理桌面应用。Electron + React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui。独立 exe，不依赖 WPS。

## 核心铁律（拼好码）

```
成熟能力解决通用问题，胶水代码连接业务流程，自研只服务真正不可替代的差异。
```

- 能复用时不重造 → 先查 package.json，再查 npm/GitHub
- 写完必须跑 `npx tsc --noEmit && npx vite build`，零错误才算过
- 不自审自过 → 用门禁说话
- 不确定就问 → 不猜测用户意图
- 禁止重写：docxtemplater / ExcelJS / Dexie.js / shadcn/ui / MiniSearch / mammoth / pdfjs-dist

## 技术栈速查

| 类别 | 方案 | 版本 |
|------|------|------|
| 框架 | React | 18.2 |
| 语言 | TypeScript | 5.3 |
| 构建 | Vite | 5.1 |
| 样式 | Tailwind CSS | 3.4 |
| UI | shadcn/ui + Radix | - |
| 状态 | Zustand | 4.5 |
| 路由 | react-router-dom | 6.22 |
| 数据库 | Dexie.js | 4.0 |
| 表单 | react-hook-form + zod | 7.51 + 3.22 |
| Word | docxtemplater + pizzip | 3.47 + 3.1 |
| Excel | ExcelJS | 4.4 |
| 图表 | Chart.js + react-chartjs-2 | 4.4 + 5.2 |
| 检索 | MiniSearch | 7+ ✅ |
| AI | openai (OpenAI SDK) | 4+ ✅ |
| 切分 | @langchain/textsplitters | latest ✅ |
| 分词 | @node-rs/jieba | latest ✅ |

## 已知待修 Bug（v5.0 改造期间不要动这些区域）

溜哥正在修这些 bug，改造模块时不要碰相关文件，避免引入新问题：

| # | Bug | 涉及文件 | 现象 |
|---|-----|---------|------|
| 1 | 模板库新建分类不显示 | `src/pages/templates/`、`src/db/` | 提示"新建成功"但界面不刷新，文件夹不出现 |
| 2 | 模板变量只能输入一个字 | `src/pages/templates/components/` | 打开 Word 模板 → 变量面板 → 新增变量，输入一个字后无法继续输入 |
| 3 | Word 加载一直转圈 | `src/pages/templates/`、`src/services/templateService.ts` | 加载 Word 文件时卡在 loading，需刷新整个页面才能加载 |

**原则**：当前 v5.0 改造只改 services 层的分词、AI、切分、检索 4 个模块，不碰模板库 UI 和页面逻辑。

## 每次交代码前

- [ ] 有没有自研代码可用成熟库替代？
- [ ] `npx tsc --noEmit` 零错误？
- [ ] `npx vite build` 通过？
- [ ] 有没有引入 `any` 类型？
- [ ] 有没有吞掉异常（空 catch）？
- [ ] 有没有碰模板库的 UI 组件？（当前禁止）