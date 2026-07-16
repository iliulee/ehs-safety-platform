# EHS 安全管理平台

> 西南某高原机场改扩建项目 · 安全总监的 AI 实战项目

一套给工地安全员用的桌面端 EHS 平台。工人管理、设备台账、隐患排查、安全教育、违章处罚、AI 拆解、Word 日报——把纸质流程干掉，把安全日志从 2 小时压到 15 分钟。

**当前状态**：v5.0.2 MVP，4 个核心模块跑通，还有很多瑕疵。

---

## 🟢 核心模块

| 模块 | 功能 | 状态 |
|------|------|------|
| 工人管理 | 身份证 OCR 自动填、增删改、离场/复工 | ✅ |
| 设备管理 | 铭牌 OCR 识别、验收记录 | ✅ |
| 隐患/教育/处罚 | 3 张主表 + AI 拆解（口述文字直接写表）| ✅ |
| Word 日报 | 选模板 → 一键生成 | ✅ |
| 培训签字 | 拍照上传签字照片 | ✅ |
| 数据迁移 | 旧表 → 新表一键迁移 | ✅ |

## ⚠️ 已知问题

| # | 问题 | 状态 |
|---|------|------|
| 1 | 模板库新建分类不显示 | v5.1 修复 |
| 2 | 模板变量只能输入一个字 | v5.1 修复 |
| 3 | Word 加载一直转圈 | v5.1 修复 |
| 4 | 设备管理增删改未做独立页面 | v5.1 修复 |
| 5 | jieba-wasm 未安装，分词用 fallback | 不影响功能 |

---

## 🛠 技术栈

| 类别 | 方案 | 用途 |
|------|------|------|
| 框架 | React 18 + TypeScript 5 | UI |
| 构建 | Vite 5 | 开发/打包 |
| 桌面 | Electron（规划中） | 独立 exe |
| 样式 | Tailwind CSS 3 + shadcn/ui | 界面 |
| 状态 | Zustand 4.5 | 全局状态 |
| 数据库 | Dexie.js 4.0（IndexedDB） | 本地存储 |
| 表单 | react-hook-form + zod | 校验 |
| Word | docxtemplater + pizzip | 日报生成 |
| OCR | tesseract.js 7 | 身份证/铭牌 |
| AI | OpenAI SDK + DeepSeek | 文字拆解 |
| 检索 | MiniSearch | 全文搜索 |
| 分词 | @node-rs/jieba（fallback） | 中文分词 |

---

## 🚀 快速开始

```bash
# 安装
npm install

# 开发
npm run dev

# 构建
npm run build

# 类型检查
npx tsc --noEmit
```

> 构建时如内存不够：`$env:NODE_OPTIONS='--max-old-space-size=4096'; npx vite build`

---

## 📁 项目结构

```
src/
├── components/ui/        # shadcn/ui 组件
├── db/                   # Dexie 数据库定义（29 张表）
├── pages/
│   ├── workers/          # 工人管理
│   ├── equipment/        # 设备管理
│   ├── hazards/          # 隐患排查
│   ├── education/        # 安全教育
│   ├── penalties/        # 违章处罚
│   ├── training/         # 培训记录
│   ├── report/           # 日报 + AI 拆解
│   ├── settings/         # 设置（AI 配置、数据迁移）
│   └── templates/        # 模板库（⚠️ 3 个已知 bug）
├── services/             # 业务逻辑
│   ├── ai.service.ts     # DeepSeek API 调用
│   ├── ai-parser.service.ts  # AI 拆解（zod schema）
│   ├── worker.service.ts
│   ├── hazard.service.ts
│   ├── education.service.ts
│   ├── training.service.ts
│   ├── generate-daily-log.service.ts  # Word 日报
│   └── db-migrate.service.ts  # 数据迁移
├── store/                # Zustand 状态
└── types/                # TypeScript 类型
```

---

## 📖 开发故事

### 背景

以前找外包做这套系统，报价 20-50 万。经济形势不好，一直没批。

### 阶段一：WPS 插件（推倒重来）

最早做 WPS 多维表格插件，3 周后放弃。插件 API 不一致、字段映射复杂、离线用不了。

### 阶段二：Electron + 本地数据库（2 周跑通）

换技术栈：React + Dexie + tesseract.js + docxtemplater。WPS 退到"只生成 Word"。

### 迭代

- **v4.1.3**：全功能（功能蔓延，做不动）
- **v5.0**：砍到 MVP（安全施工日志切入）
- **v5.0.1**：EHS "人-事-证" 三层模型
- **v5.0.2**：新表激活 + 签字照片 + 数据迁移
- **v5.0.2-4**：复工按钮 + AI 拆解修复 + 直接保存

整个过程用 TRAE 做"AI 调度"：出方案 → 自我审计 → 写精确提示词 → Code AI 写代码 → 门禁验收。

---

## 🤖 AI 使用方式

不是"AI 代写代码"，是"AI 帮我管理 AI 写代码的过程"。

1. **TRAE 出方案**：描述问题 → AI 定位根因 → 给方案
2. **TRAE 自我审计**：检查方案有没有越界、遗漏
3. **给 Code AI 精确提示词**：精确到文件名、字段名、门禁、严禁触碰清单
4. **门禁验证**：`tsc --noEmit` + `vite build` 零错误才通过

---

## 📝 许可证

MIT

---

## 👤 作者

西南某高原机场改扩建项目安全总监，10 年安全管理经验，6 周前开始学 TypeScript。

GitHub: [@iliulee](https://github.com/iliulee)