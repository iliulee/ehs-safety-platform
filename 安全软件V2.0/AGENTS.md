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
| 检索 | MiniSearch | 7+ （📦 待安装） |
| AI | openai (OpenAI SDK) | 4+ （📦 待安装） |
| 切分 | @langchain/textsplitters | latest （📦 待安装） |
| 分词 | @node-rs/jieba | latest （📦 待安装） |

## 每次交代码前

- [ ] 有没有自研代码可用成熟库替代？
- [ ] `npx tsc --noEmit` 零错误？
- [ ] `npx vite build` 通过？
- [ ] 有没有引入 `any` 类型？
- [ ] 有没有吞掉异常（空 catch）？