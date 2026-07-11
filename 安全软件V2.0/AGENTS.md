# AGENTS.md — 安全管理平台 AI 编码入口

> Trae 每次开新会话自动加载本文件。不要删除。

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