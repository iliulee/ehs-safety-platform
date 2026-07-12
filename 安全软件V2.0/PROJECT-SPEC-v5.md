# 溜哥的安全管理平台 — PRODUCT SPEC v5.0

> 文件名：`PROJECT-SPEC-v5.md`
> 更新日期：2026-07-12
> 上一版：v4.1.3（已废弃，Git 保留）
> 当前目标：2 天 MVP，以"安全施工日志"为切入口

---

## 〇、版本与原则

### 0.1 版本说明

| 版本 | 状态 | 说明 |
|------|------|------|
| v1.0 - v3.x | 历史 | 早期版本 |
| v4.0 - v4.1.3 | 已完成 | 全功能 EHS 平台，3 万行 SPEC，40+ 张表 |
| **v5.0** | **当前** | **聚焦 MVP 切入口，砍掉非核心功能** |
| v6.0+ | 规划 | v5.0 跑通后，逐项恢复完整 EHS 功能 |

### 0.2 核心铁律（拼好码）

```
成熟能力解决通用问题，胶水代码连接业务流程，自研只服务真正不可替代的差异。
```

- 能复用时不重造 → 先查 package.json，再查 npm/GitHub
- 写完必须跑 `npx tsc --noEmit && npx vite build`，零错误才算过
- 不自审自过 → 用门禁说话
- 不确定就问 → 不猜测用户意图
- 禁止重写：docxtemplater / ExcelJS / Dexie.js / shadcn/ui / MiniSearch / mammoth / pdfjs-dist / tesseract.js

### 0.3 v5.0 范围裁决（最重要一节）

v4.1.3 是一个"功能蔓延"的全功能 EHS 平台。**v5.0 不推翻 v4，而是聚焦"安全施工日志"切入口，砍掉非核心功能。**

| 决策 | 范围 | 理由 |
|------|------|------|
| **保留** | 11 张核心业务表、数据录入页、文档生成、模板系统 | 已有代码可用，是数据驱动生成的核心 |
| **保留** | v5.0 已完成的 4 个模块（分词/AI/切分/检索） | 已稳定 |
| **保留** | v6.0 新增的 OCR、AI 文字拆解 | v5.0 的核心增量 |
| **降级** | 模板编辑器（docx-editor、Univer） | 从"主入口"降为"预览器" |
| **隐藏** | 27 个模块中的非 MVP 模块 | feature flag 关闭 |
| **暂不修** | 模板库 3 个已知 bug | 留到 v5.1 |

**v5.0 唯一目标：用户能在一个页面上，从微信语音输入的文字（或拍照），自动填表，自动生成当天的安全施工日志 Word。**

---

## 一、产品定位

### 1.1 一句话定位

溜哥（大理机场改扩建项目安全总监）的桌面端 EHS 助手——**用手机输入法语音 → AI 拆解 → 填表 → 一键生成 Word 安全施工日志**。

### 1.2 目标用户

| 用户 | 场景 | 频次 |
|------|------|------|
| 溜哥本人 | 工地安全总监，每天下班写日志 | 每日 1 次 |
| 其他安全员 | 工地安全员，提交隐患/教育/验收 | 每日 3-5 次 |
| 项目经理 | 抽查、签字、归档 | 每周 2-3 次 |

### 1.3 核心价值

| 旧方式 | v5.0 方式 | 效率提升 |
|--------|----------|---------|
| 晚上手写日志 30 分钟 | 微信语音说 1 分钟 → AI 拆解 → 一键生成 | **30 倍** |
| 抄身份证信息 5 分钟 | 拍照身份证 → 自动填表 | **5 倍** |
| 抄设备编号 3 分钟 | 拍照铭牌 → 自动填表 | **3 倍** |

---

## 二、MVP 三大能力

### 2.1 能力一：身份证 OCR 自动填工人

**用户场景**：工地进场一批工人，录入系统。

**v4 流程**：手动输入姓名、身份证号、地址 → 2 分钟/人

**v5 流程**：上传身份证正反面照片 → 自动识别填入 → 确认保存 → 30 秒/人

**实现**：
- 库：`tesseract.js` v7（37.4k dependents，Apache-2.0，TypeScript 友好，Electron 兼容）
- 服务：`src/services/ocr.service.ts`
- API：`recognizeIdCard(image: File): Promise<{name, idNumber, address, gender}>`
- 正则提取：身份证 18 位 + 姓名 + 地址 + 性别
- 语言包：`chi_sim`（简体中文）

**降级方案**：识别失败 → 手动输入兜底

### 2.2 能力二：设备铭牌 OCR

**用户场景**：机械设备进场验收，登记编号。

**v4 流程**：现场手抄设备铭牌 → 回来再录入 → 5 分钟/台

**v5 流程**：现场拍照 → 自动识别编号 → 填表 → 30 秒/台

**实现**：
- 库：复用 `tesseract.js` v7
- 服务：`src/services/ocr.service.ts`
- API：`recognizeEquipmentNameplate(image): Promise<string>`
- 提取规则：取识别文本中包含数字+字母混合的连续串，优先取最长

**降级方案**：手动输入编号

### 2.3 能力三：AI 文字拆解到各表

**用户场景**：溜哥下班口述当天工作。

**示例输入**（微信语音输入的文字）：
```
今天没有危大作业。上午 9 点开展了进场安全教育，人员是张三、李四、王二、马波。
下午进行了塔吊月度验收。3 点发现一处临边防护缺失，已通知整改。
今天天气晴，30 度。
```

**AI 拆解结果**（写入 11 张表中对应表）：
```json
{
  "dailyLog": {
    "date": "2026-07-12",
    "weather": "晴",
    "temperature": 30,
    "workContent": "无危大作业",
    "issues": "临边防护缺失 1 处"
  },
  "educationRecord": {
    "date": "2026-07-12",
    "topic": "进场安全教育",
    "attendees": ["张三", "李四", "王二", "马波"]
  },
  "hazard": {
    "date": "2026-07-12",
    "title": "临边防护缺失",
    "level": "general",
    "status": "rectifying"
  },
  "acceptance": {
    "date": "2026-07-12",
    "type": "塔吊月度验收"
  }
}
```

**实现**：
- 库：OpenAI Node SDK（模块 2 已完成）+ zod schema
- 服务：`src/services/ai-parser.service.ts`
- API：`parseDailyNarrative(text: string): Promise<ParsedDailyData>`
- zod schema 严格约束 11 张表的关键字段
- DeepSeek `response_format: { type: 'json_object' }`

**降级方案**：AI 拆解失败 → 手动填表

---

## 三、技术架构

### 3.1 技术栈（已锁定）

| 类别 | 方案 | 版本 | 状态 |
|------|------|------|------|
| 框架 | React + TypeScript | 18.2 + 5.3 | ✅ |
| 构建 | Vite | 5.1 | ✅ |
| 样式 | Tailwind CSS + shadcn/ui | 3.4 | ✅ |
| 状态 | Zustand | 4.5 | ✅ |
| 路由 | react-router-dom | 6.22 | ✅ |
| 数据库 | Dexie.js | 4.0 | ✅ |
| 表单 | react-hook-form + zod | 7.51 + 3.22 | ✅ |
| Word | docxtemplater + pizzip | 3.47 + 3.1 | ✅ |
| Excel | ExcelJS | 4.4 | ✅ |
| 检索 | MiniSearch | 7+ | ✅ |
| AI | openai (OpenAI SDK) | 4+ | ✅ |
| 切分 | @langchain/textsplitters | latest | ✅ |
| 分词 | @node-rs/jieba | latest | ✅ |
| OCR | tesseract.js | 7+ | ✅ |
| 桌面 | Electron | 28+ | Phase 0 |

### 3.2 模块依赖关系

```
┌────────────────────────────────────────────────────┐
│                  DailyReportPage                    │  ← 唯一入口
│  (选日期 / 看历史 / AI 拆解 / 一键生成 Word)          │
└──────┬──────────────────┬──────────────────┬────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│ ocr.service │    │ai-parser.    │    │ generate.    │
│  - 身份证    │    │ service      │    │  service     │
│  - 设备铭牌  │    │ - 文字拆解   │    │ - docxtemplate│
└──────┬──────┘    └──────┬───────┘    └──────┬───────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌──────────────────────────────────────────────────┐
│              Dexie 11 张核心业务表                 │
│  projects / workers / hazards / educationRecords  │
│  dailyLogs / acceptances / penalties / meetings   │
│  dangerousProjects / workPermits / subcontractors │
└──────────────────────────────────────────────────┘
```

### 3.3 文件结构（v5.0 重点）

```
src/
├── services/
│   ├── ocr.service.ts              ← 新建（v5.0 Day 1）
│   ├── ai-parser.service.ts        ← 新建（v5.0 Day 2）
│   ├── generate.service.ts         ← 复用 v4
│   ├── ai.service.ts               ← v5.0 模块 2 已完成
│   ├── tokenizer.adapter.ts        ← v5.0 模块 1 已完成
│   ├── chunker.adapter.ts          ← v5.0 模块 3 已完成
│   ├── mini-search.adapter.ts      ← v5.0 模块 4 已完成
│   └── ...（其他 v4 服务）
├── pages/
│   ├── dailylog/
│   │   ├── LogListPage.tsx         ← 改为入口
│   │   └── DailyReportPage.tsx     ← 主页面（改造）
│   ├── workers/                    ← 加 OCR 入口
│   ├── equipment/                  ← 加 OCR 入口
│   └── templates/                  ← 隐藏/降级
├── db/
│   ├── db.ts                       ← 11 张表，保留
│   └── repositories/               ← 数据仓库
└── types/
    └── db.ts                       ← 类型定义
```

---

## 四、数据模型（v5.0 精简）

v5.0 不新建表，复用 v4 的 11 张表。

### 4.1 11 张核心表

| 表名 | 用途 | MVP 关键字段 |
|------|------|------------|
| `projects` | 项目主档 | id, name, code, managerId, location |
| `subcontractors` | 分包单位 | id, projectId, name, contact, qualification |
| `workers` | 工人名册 | id, projectId, name, idNumber, role, phone, entryDate |
| `hazards` | 隐患排查 | id, projectId, date, title, level, location, status |
| `educationRecords` | 安全教育 | id, projectId, date, topic, attendeeIds[] |
| `trainingRecords` | 安全培训 | id, projectId, date, topic, attendeeIds[] |
| `dailyLogs` | 安全施工日志 | id, projectId, date, weather, workContent, issues, temperature |
| `meetings` | 安全会议 | id, projectId, date, topic, host, attendees[] |
| `penalties` | 处罚记录 | id, projectId, date, targetId, reason, amount |
| `dangerousProjects` | 危大工程 | id, projectId, category, level, status, startDate |
| `workPermits` | 作业许可 | id, projectId, type, status, validFrom, validTo |
| `acceptances` | 验收记录 | id, projectId, date, type, equipmentId, result |

**这 11 张表在 v4 已有，v5.0 不动 schema。**

### 4.2 关联关系

```
projects (1) ──< (N) workers
projects (1) ──< (N) hazards
projects (1) ──< (N) dailyLogs
projects (1) ──< (N) educationRecords
projects (1) ──< (N) acceptances
subcontractors (1) ──< (N) workers
educationRecords (N) >── (N) workers   ← 通过 attendeeIds 关联
hazards (N) ──< (1) workers            ← 责任人
acceptances (N) ──< (1) equipment      ← 设备表（如已建）
```

---

## 五、交互流程（详细到点击）

### 5.1 核心流程：安全施工日志

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 用户打开"今日安全日志"页（默认入口）                     │
│ - 路由：/dailylog/today                                       │
│ - 显示：今日日期、当日已录入数据、AI 拆解输入框、生成按钮         │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 用户输入当日工作                                      │
│ 选项 A：微信语音输入法 → 大段文字                              │
│ 选项 B：拍照（身份证/设备）→ 自动填表                          │
│ 选项 C：手动点"添加隐患/教育/验收"按钮 → 弹表单                │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: AI 自动拆解（点"AI 拆解"按钮）                        │
│ - 输入：大段文字（200-1000 字）                                │
│ - AI 返回：JSON 对象，对应各表字段                              │
│ - 前端：填入各表单，用户确认/修改/补全                          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: 一键生成 Word                                         │
│ - 点"生成今日安全日志"按钮                                    │
│ - docxtemplater 套预设模板                                   │
│ - 模板变量：从 dailyLog + 当日各表数据自动填充                 │
│ - 输出：当日安全施工日志 Word                                  │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: 预览/下载                                             │
│ - 弹出预览（不自动打开编辑器）                                  │
│ - 确认无误 → 保存到本地 + 入档                                 │
│ - 需要微调 → 用外部 Word 打开                                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 辅助流程：进场工人录入

```
打开工人列表 → 点"新增工人"
  → 弹表单（react-hook-form + zod）
    → 顶部加 2 个按钮："拍照身份证" / "上传身份证照片"
      → 调 ocr.service.recognizeIdCard()
        → 自动填入 name, idNumber, address, gender
          → 用户确认/补全 phone, role, subcontractorId
            → 保存到 workers 表
```

### 5.3 辅助流程：设备铭牌录入

```
打开设备/验收页 → 点"新增"
  → 弹表单
    → 顶部加 1 个按钮："拍照识别铭牌"
      → 调 ocr.service.recognizeEquipmentNameplate()
        → 自动填入 equipmentCode
          → 用户确认/补全其他字段
            → 保存到 acceptances/equipment 表
```

---

## 六、AI 文字拆解详细设计

### 6.1 zod schema 定义

```typescript
// src/services/ai-parser.service.ts
import { z } from 'zod';

export const ParsedDailyDataSchema = z.object({
  dailyLog: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weather: z.enum(['晴', '多云', '阴', '雨', '雪', '雾']).optional(),
    temperature: z.number().min(-30).max(50).optional(),
    workContent: z.string().optional(),
    safetyMeasures: z.string().optional(),
    issues: z.string().optional()
  }).optional(),
  
  dangerousProjects: z.array(z.object({
    category: z.string(),
    isOperating: z.boolean(),
    notes: z.string().optional()
  })).optional(),
  
  educationRecords: z.array(z.object({
    date: z.string(),
    topic: z.string(),
    attendeeNames: z.array(z.string())  // AI 给出姓名，自动匹配 workers.id
  })).optional(),
  
  hazards: z.array(z.object({
    date: z.string(),
    title: z.string(),
    level: z.enum(['general', 'major', 'critical']),
    location: z.string().optional(),
    status: z.enum(['pending', 'rectifying', 'closed'])
  })).optional(),
  
  acceptances: z.array(z.object({
    date: z.string(),
    type: z.string(),
    equipmentCode: z.string().optional()
  })).optional(),
  
  penalties: z.array(z.object({
    date: z.string(),
    targetName: z.string(),
    reason: z.string(),
    amount: z.number().optional()
  })).optional()
});

export type ParsedDailyData = z.infer<typeof ParsedDailyDataSchema>;
```

### 6.2 Prompt 模板

```
你是机场改扩建工程的安全助手。读以下工地安全员口述的文字，提取结构化信息。

【文字】
{userInput}

【要求】
- 严格按照 JSON 格式返回，不要任何解释
- 日期格式：YYYY-MM-DD
- 姓名：仅保留中文姓名
- 隐患等级：general(一般) / major(较大) / critical(重大)
- 隐患状态：pending(待整改) / rectifying(整改中) / closed(已关闭)
- 天气：晴/多云/阴/雨/雪/雾 之一
- 温度：数字，无单位
```

### 6.3 调用示例

```typescript
const userText = "今天没有危大作业。上午 9 点开展了进场安全教育，人员是张三、李四、王二、马波。下午进行了塔吊月度验收。3 点发现一处临边防护缺失，已通知整改。今天天气晴，30 度。";

const result = await aiParser.parseDailyNarrative(userText, projectId);
// result.dailyLog.weather === "晴"
// result.educationRecords[0].attendeeNames === ["张三", "李四", "王二", "马波"]
// result.hazards[0].title === "临边防护缺失"
```

### 6.4 工人姓名匹配

AI 只给出姓名，需要匹配 workers 表得到 workerId：

```typescript
// src/services/worker-matcher.service.ts
async function matchWorkers(names: string[], projectId: string): Promise<string[]> {
  const workers = await db.workers.where({ projectId }).toArray();
  return names.map(name => {
    const matched = workers.find(w => w.name === name);
    if (!matched) {
      console.warn(`工人未找到: ${name}`);
      return null;  // 提示用户手动补充
    }
    return matched.id;
  }).filter(Boolean);
}
```

---

## 七、OCR 详细设计

### 7.1 服务结构

```typescript
// src/services/ocr.service.ts
import { createWorker, Worker } from 'tesseract.js';

class OCRService {
  private workerPool: Map<string, Worker> = new Map();
  
  async recognizeIdCard(image: File | Blob | string): Promise<IDCardInfo> {
    const text = await this.recognize(image, 'chi_sim');
    return this.parseIdCardText(text);
  }
  
  async recognizeEquipmentNameplate(image: File | Blob | string): Promise<string> {
    const text = await this.recognize(image, 'chi_sim+eng');
    return this.extractEquipmentCode(text);
  }
  
  private async recognize(image: File | Blob | string, lang: string): Promise<string> {
    const worker = await this.getWorker(lang);
    const { data: { text } } = await worker.recognize(image);
    return text;
  }
  
  private parseIdCardText(text: string): IDCardInfo {
    // 提取姓名：身份证正面的"姓名"标签后的字
    // 提取身份证号：18 位数字+字母
    // 提取地址：识别"住址"标签后的字
    // 提取性别：男/女
    const idNumber = text.match(/\d{17}[\dXx]/)?.[0] || '';
    const gender = text.includes('男') ? '男' : text.includes('女') ? '女' : '';
    const name = this.extractAfter(text, '姓名');
    const address = this.extractAfter(text, '住址');
    return { name, idNumber, address, gender };
  }
  
  private extractEquipmentCode(text: string): string {
    // 取文本中包含数字+字母的连续串，优先取最长
    const matches = text.match(/[A-Za-z0-9]+/g) || [];
    return matches.sort((a, b) => b.length - a.length)[0] || '';
  }
}

export const ocrService = new OCRService();
```

### 7.2 单例 Worker 池

```typescript
private async getWorker(lang: string): Promise<Worker> {
  if (!this.workerPool.has(lang)) {
    const worker = await createWorker(lang);
    this.workerPool.set(lang, worker);
  }
  return this.workerPool.get(lang)!;
}
```

### 7.3 性能预估

| 阶段 | 耗时 |
|------|------|
| 首次加载 chi_sim 语言包 | 3-5 秒 |
| 识别身份证 | 2-3 秒 |
| 识别设备铭牌 | 1-2 秒 |
| 后续识别（worker 复用） | 1-2 秒 |

---

## 八、2 天交付计划

### 8.1 Day 1（今天）：OCR 接入

| 任务 | 改哪里 | 涉及库 | 时间 |
|------|-------|--------|------|
| 安装 tesseract.js | `npm i tesseract.js` | tesseract.js v7 | 1 分钟（已完成）|
| 写 `ocr.service.ts` | 新建 `src/services/ocr.service.ts` | tesseract.js | 2 小时 |
| 工人页加按钮 | 改 `src/pages/workers/` | 调用 ocr.service | 1 小时 |
| 设备页加按钮 | 改 `src/pages/equipment/` | 调用 ocr.service | 1 小时 |
| 门禁验证 | `tsc --noEmit` + `vite build` | — | 30 分钟 |
| Git 提交 | `git commit` | — | 5 分钟 |

### 8.2 Day 2（明天）：AI 拆解 + 日志生成

| 任务 | 改哪里 | 涉及库 | 时间 |
|------|-------|--------|------|
| 写 `ai-parser.service.ts` | 新建 `src/services/ai-parser.service.ts` | openai + zod | 2 小时 |
| 写 `worker-matcher.service.ts` | 新建 | Dexie | 30 分钟 |
| DailyReportPage 改造 | 改 `src/pages/dailylog/DailyReportPage.tsx` | — | 2 小时 |
| 模板变量映射 | 改 docxtemplater 模板（已存在） | docxtemplater | 1 小时 |
| 门禁验证 | `tsc --noEmit` + `vite build` | — | 30 分钟 |
| Git 提交 | `git commit` | — | 5 分钟 |

### 8.3 验收标准

**Day 1 验收**：
- [ ] 打开工人表单 → 点"拍照身份证" → 上传 → 字段自动填入
- [ ] 打开设备表单 → 点"拍照铭牌" → 上传 → 编号自动填入
- [ ] 识别失败时，提示"识别失败，请手动输入"
- [ ] `tsc --noEmit` 零错误，`vite build` 通过

**Day 2 验收**：
- [ ] 打开今日日志页 → 文本框输入大段文字 → 点"AI 拆解"
- [ ] 弹出预览，显示拆解结果（隐患/教育/验收等）
- [ ] 确认无误 → 点"生成日志" → 下载 Word
- [ ] Word 包含日期、天气、工人名、隐患列表
- [ ] `tsc --noEmit` 零错误，`vite build` 通过

---

## 九、降级与异常处理

### 9.1 OCR 失败降级

```typescript
try {
  const result = await ocrService.recognizeIdCard(image);
  // 填入表单
} catch (error) {
  toast.error('识别失败，请手动输入');
  // 弹窗引导用户手动输入
}
```

### 9.2 AI 拆解失败降级

```typescript
try {
  const result = await aiParser.parseDailyNarrative(text, projectId);
  // 显示拆解结果
} catch (error) {
  toast.error('AI 拆解失败，请手动填表');
  // 切换到手动录入模式
}
```

### 9.3 工人姓名未匹配

如果 AI 给出的姓名在 workers 表中找不到，提示用户：
```
未找到工人"马波"，请：
- 确认姓名是否正确
- 或先到工人管理页录入"马波"信息
```

---

## 十、不做（v5.0 范围外）

| 不做 | 原因 | 何时做 |
|------|------|--------|
| 模板编辑器修复 | 3 个 bug 还在 | v5.1 |
| 自然语言语音录入 | 用微信输入法解决 | 永远不做（输入法更专业）|
| 复杂排版/打印 | v5.0 只生成 Word | v6.0+ |
| 多用户协作 | 单机单用户场景 | v6.0+ |
| 移动端 | v5.0 是桌面应用 | 不做 |
| 知识库/RAG 完整化 | 模块 4 完成后只做基础 | v6.0+ |
| 数据导出/导入 | 单机场景不需要 | v6.0+ |
| 备份/恢复 | 单机场景不需要 | v6.0+ |

---

## 十一、风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| tesseract.js 中文识别率低 | OCR 字段缺失 | 降级到手动输入；用更清晰的身份证照片 |
| DeepSeek 拆解不准 | AI 拆解字段缺失 | 用户确认环节补全；调 prompt 优化 |
| Worker 池内存泄漏 | 应用变卡 | 退出页面时 terminate worker |
| Electron 打包后 OCR 慢 | 用户体验差 | 用 Web Worker + 进度条 |
| 工人姓名重名 | 匹配错 | 加班组/分包单位前缀区分 |

---

## 十二、附录

### 12.1 Git 记录

```
d5f22f9 v6.0 MVP 切入口：tesseract.js + AI 拆解
9d2f7b7 docs: 新建 Code 任务操作清单
617011b v5.0 模块2：AI 调用切换为 OpenAI SDK
a1dad8d v5.0 模块1：中文分词切换为 @node-rs/jieba
33cb22b docs: 记录 3 个已知待修 Bug
94d3679 docs: 更新依赖状态标记为已安装
9c0036f v5.0 依赖安装
f99ec76 v4.1.3 快照
```

### 12.2 核心库版本

```
react 18.2.0
typescript 5.3.3
vite 5.1.4
dexie 4.0.1
docxtemplater 3.47.4
exceljs 4.4.0
openai 4+
minisearch 7+
@langchain/textsplitters latest
@node-rs/jieba latest
tesseract.js 7+
```

### 12.3 模板与文件位置

| 文件 | 位置 | 作用 |
|------|------|------|
| `AGENTS.md` | `F:\安全管理平台\安全软件V2.0\` | AI 编码入口规则 |
| `VIBE_CODING_PROMPT.md` | `F:\安全管理平台\安全软件V2.0\` | 编码规范手册 |
| `PROJECT-SPEC-v5.md` | `F:\安全管理平台\安全软件V2.0\` | 当前规范（本文档） |
| `PROJECT-SPEC-v4.1.3.md` | `F:\安全管理平台\安全软件V2.0\` | 历史规范（保留对照）|
| 安全施工日志模板 | `src/templates/daily-log-template.docx` | Word 模板（需新建）|

### 12.4 已知 Bug 列表（暂不修）

| # | Bug | 文件 | 状态 |
|---|-----|------|------|
| 1 | 模板库新建分类不显示 | `src/pages/templates/` | v5.1 修 |
| 2 | 模板变量只能输入一个字 | `src/pages/templates/components/` | v5.1 修 |
| 3 | Word 加载一直转圈 | `src/pages/templates/` | v5.1 修 |

### 12.5 参考资料

- [vibe-coding-cn](https://github.com/tradecatlabs/vibe-coding-cn) — 拼好码原则来源
- [tesseract.js v7](https://github.com/naptha/tesseract.js) — OCR 引擎
- [OpenAI Node SDK](https://github.com/openai/openai-node) — AI 调用
- [docxtemplater](https://docxtemplater.com/) — Word 模板生成
- [Dexie.js](https://dexie.org/) — IndexedDB 封装

---

> v5.0 是一次"做减法"的胜利——不是加更多功能，而是聚焦最痛的一个点：安全施工日志。
> 当你能用一段语音 + 一张照片，2 分钟内生成当天日志时，v5.0 就成功了。
