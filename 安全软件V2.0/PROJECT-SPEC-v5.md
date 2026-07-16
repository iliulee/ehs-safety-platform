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
| **保留** | 12 张核心业务表、数据录入页、文档生成、模板系统 | 已有代码可用，是数据驱动生成的核心 |
| **保留** | v5.0 已完成的 4 个模块（分词/AI/切分/检索） | 已稳定 |
| **保留** | v5.0 新增的 OCR、AI 文字拆解 | v5.0 的核心增量 |
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

**AI 拆解结果**（写入 12 张表中对应表）：
```json
{
  "dailyLog": {
    "date": "2026-07-12",
    "weather": "晴",
    "temperature": 30,
    "workContent": "无危大作业",
    "issues": "临边防护缺失 1 处"
  },
  "educationRecords": {
    "date": "2026-07-12",
    "topic": "进场安全教育",
    "attendees": ["张三", "李四", "王二", "马波"]
  },
  "hazards": {
    "date": "2026-07-12",
    "title": "临边防护缺失",
    "level": "general",
    "status": "rectifying"
  },
  "acceptances": {
    "date": "2026-07-12",
    "type": "塔吊月度验收"
  }
}
```

**实现**：
- 库：OpenAI Node SDK（模块 2 已完成）+ zod schema
- 服务：`src/services/ai-parser.service.ts`
- API：`parseDailyNarrative(text: string): Promise<ParsedDailyData>`
- zod schema 严格约束 12 张表的关键字段
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
| 桌面 | Electron | 28+ | ⏳ v5.0 MVP 以 Vite dev server 运行，v5.1 打包为独立 exe |

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
│              Dexie 12 张核心业务表                 │
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
│   ├── worker-matcher.service.ts   ← 新建（v5.0 Day 2）
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
│   ├── db.ts                       ← 12 张表，保留
│   └── repositories/               ← 数据仓库
└── types/
    └── db.ts                       ← 类型定义
```

---

## 四、数据模型（v5.0 精简）

v5.0 不新建表，复用 v4 的 12 张表。

### 4.1 12 张核心表

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

**这 12 张表在 v4 已有，v5.0 不动 schema。**

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
acceptances (N) ──< (1) equipmentId（自由文本，非外键）
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
│   （手机微信语音输入 → 发送到文件传输助手 → 桌面端复制 → 粘贴到输入框） │
│ 选项 B：拍照（身份证/设备）→ 自动填表                          │
│ 选项 C：手动点"添加隐患/教育/验收"按钮 → 跳转独立页面填表     │
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
  → 跳转到独立页面 /workers/new（布局见 §12.7.1）
    → 页面顶部：OCR 常驻卡片（左图右文，textarea 可复制）
      → 拍照/上传身份证 → tesseract.js 识别
        → 右侧 textarea 显示完整识别文字
        → 下方"建议填入"列表，每个字段旁有 [→ 填入] 按钮
          → 用户一键填入 name, idNumber, address, gender
            → 用户补全 phone, workType, subcontractorId
              → 底部固定栏点"保存" → 写入 workers 表
                → 返回列表页
```

### 5.3 辅助流程：设备铭牌录入

```
打开设备/验收页 → 点"新增"
  → 跳转到独立页面 /equipment/new（布局见 §12.7.1）
    → 页面顶部：OCR 常驻卡片（左图右文）
      → 拍照/上传铭牌 → tesseract.js 识别
        → 右侧 textarea 显示完整识别文字
        → 下方"建议填入"列表，每个字段旁有 [→ 填入] 按钮
          → 用户一键填入 model, code, category
            → 铭牌其他参数（力矩、功率等）→ 填入 remark 备注
              → 用户补全 status, projectId, subcontractorId
                → 底部固定栏点"保存" → 写入 acceptances/equipment 表
                  → 返回列表页
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

### 6.5 AI 解析超时与重试策略

```typescript
// ai-parser.service.ts 中的超时包装
async parseDailyNarrative(text: string, projectId: string): Promise<ParsedDailyData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 秒超时

  try {
    const response = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildPrompt(text) }],
      response_format: { type: 'json_object' },
    }, { signal: controller.signal });

    const parsed = JSON.parse(response.choices[0].message.content);
    return ParsedDailyDataSchema.parse(parsed);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AIParseError('AI 解析超时，请检查网络后重试');
    }
    throw new AIParseError('AI 返回格式异常，请重试或手动填表');
  } finally {
    clearTimeout(timeout);
  }
}
```

- 超时：30 秒
- 失败重试：不自动重试（避免用户等待），提示用户手动重试
- 降级路径：AI 拆解失败 → toast 提示 → 切换到手动填表模式

### 6.6 安全施工日志 Word 模板变量定义

模板文件 `src/templates/daily-log-template.docx`，需在 Day 2 前创建。docxtemplater 变量列表：

| 变量 | 来源表 | 类型 | 说明 |
|------|--------|------|------|
| `{date}` | dailyLogs | string | 日志日期 YYYY-MM-DD |
| `{weather}` | dailyLogs | string | 天气 |
| `{temperature}` | dailyLogs | number | 温度 |
| `{workContent}` | dailyLogs | string | 当日工作内容 |
| `{safetyMeasures}` | dailyLogs | string | 安全措施 |
| `{issues}` | dailyLogs | string | 存在问题 |
| `{workers}` | workers | array | 当日出勤工人列表（表格循环） |
| `{hazards}` | hazards | array | 当日隐患列表（表格循环） |
| `{educationRecords}` | educationRecords | array | 当日安全教育列表 |
| `{acceptances}` | acceptances | array | 当日验收记录列表 |
| `{dangerousProjects}` | dangerousProjects | array | 危大工程状态列表 |

模板排版要求：A4 纵向，标题"安全施工日志"，表格形式，日期/天气/温度在顶部，各列表按时间排列。

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
    const { data: { text, confidence } } = await worker.recognize(image);
    // 置信度低于 60% 时触发降级
    if (confidence < 60) {
      throw new OCRError(`识别置信度过低: ${confidence}%`);
    }
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

### 7.4 OCR 离线与缓存策略

tesseract.js 首次使用需下载 `chi_sim.traineddata`（约 10MB），在工地无网络场景下需预缓存。

| 策略 | 实现 |
|------|------|
| 首次启动 | 后台静默下载中文语言包，显示进度提示"正在准备 OCR 引擎…" |
| 离线降级 | 语言包未下载完成时，OCR 按钮置灰，提示"OCR 引擎未就绪，请连接网络后重试" |
| 缓存路径 | 使用 tesseract.js 默认缓存（`IndexedDB`），不额外管理 |
| 语言包校验 | 启动时检查 `chi_sim` 是否已缓存，未缓存则自动下载 |

### 7.5 身份证照片隐私处理

身份证照片含完整 PII（姓名、身份证号、地址），必须遵循最小化原则：

- 识别后立即释放 Blob 引用，不存储原始照片到 IndexedDB
- OCR 结果仅用于填充表单字段，不在客户端持久化照片文件
- 用户提交表单后，OCR 识别过程中的中间文本在内存中自动回收
- 如果后续需要照片存档（v6.0+），需加密存储并提示用户知情同意

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

### 9.4 错误分类体系

统一的错误类型，每种对应不同的 UI 提示和降级路径：

| 错误类型 | 触发条件 | UI 提示 | 降级路径 |
|----------|---------|--------|---------|
| `OCRError` | 置信度 < 60%、语言包未就绪 | "OCR 识别失败，请手动输入" | 切换到手动填表 |
| `AIParseError` | API 超时、返回格式错误、zod 校验失败 | "AI 拆解失败，请重试或手动填表" | 切换到手动填表模式 |
| `MatchError` | 工人姓名在 workers 表中未找到 | "未找到工人"XXX"，请确认姓名或先录入工人信息" | 提示用户手动关联 |
| `ValidationError` | 表单字段 zod 校验失败 | 具体字段错误提示 | 标红字段，阻止提交 |

```typescript
// src/types/errors.ts
export class OCRError extends Error {
  constructor(message: string) { super(message); this.name = 'OCRError'; }
}
export class AIParseError extends Error {
  constructor(message: string) { super(message); this.name = 'AIParseError'; }
}
export class MatchError extends Error {
  constructor(message: string) { super(message); this.name = 'MatchError'; }
}
```

### 9.5 数据备份（v5.0 最低方案）

虽然 §10 将完整备份列到 v6.0+，但 v5.0 至少提供 IndexedDB → JSON 导出，防止数据丢失：

- 在设置页增加"导出数据备份"按钮
- 调用 `db.exportAll()` 导出全部 12 张表为 JSON 文件
- 预计工作量：30 分钟，不阻塞 Day 1/2 主流程

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
d5f22f9 v5.0 MVP 切入口：tesseract.js + AI 拆解
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
| `PROJECT-SPEC-v4.1.3.md` | `F:\安全管理平台\安全软件V2.0\` | 历史规范（保留对照，实际文件名 `PROJECT-new_SPEC.md`）|
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

### 12.6 v5.0 Day 1 实际调整记录

Day 1 OCR 接入过程中，根据真机测试反馈对 §7 设计做了以下落地调整：

**Service 文件改动**：`src/services/ocr.service.ts`（核心引擎）、`src/services/__tests__/ocr.service.test.ts`（测试 mock 同步）、`src/types/errors.ts`（新增 OCRError）、`src/types/db.ts`（Equipment 加保险字段）、`src/pages/workers/components/WorkerFormSheet.tsx`（身份证自动归档+下载）、`src/pages/equipment/components/EquipmentForm.tsx`（铭牌入口+保险字段）。

**参数调整**：身份证识别加 `PSM.SINGLE_BLOCK`（PSM 6，单一文本块模式，适配身份证版式）；铭牌置信度阈值从 60% 降到 40%（反光+小字场景）；新增图片压缩（长边≤1500px，质量 0.85）把单次识别从 2 分钟压到 5-10 秒；Worker 池按 `lang@psm` 组合键复用，避免参数互相覆盖。

**新增功能**：① 身份证识别成功后自动写入证件备案区（已有则替换，不重复添加）；② 证件备案区每条记录加「下载原图」按钮，用 `<a download>` 触发浏览器下载；③ 铭牌 OCR 前做灰度化+对比度拉伸预处理（ImageData 操作，对比度×1.5）；④ 姓名解析降级策略——标签提取失败时从文本开头取 2-4 个连续汉字，排除「姓名/性别/民族/住址」等标签词；⑤ Equipment 类型加 `insuranceCompany/insuranceType/insuranceExpiryDate` 三个保险字段，表单同步加输入控件。

**未改动的部分**：tesseract.js 源码未改，仅通过 `setParameters` 调 PSM；`src/pages/templates/` 三个 bug 文件按约束保持不动；测试用 `importOriginal` 部分 mock 方式，保留 PSM 枚举真实导出。

### 12.7 v5.0 OCR + 表单设计原则（重要架构决策）

Day 1 Day 2 多次真机测试后，确定的**长期适用设计原则**。所有后续新增/编辑页面都按这套规则做。

#### 12.7.1 表单页面布局原则

**所有新增/编辑页面统一为独立页面（不用弹窗），全宽布局。**

| 项目 | 旧做法（废弃） | 新做法（必须） |
|------|---------------|---------------|
| 入口 | 列表页打开 Dialog 弹窗 | 列表页按钮 → 跳转到独立路由页面 |
| 路由 | — | `/workers/new`、`/workers/:id/edit`、`/equipment/new`、`/equipment/:id/edit` |
| 容器 | Dialog 模态框（受限尺寸）| 独立页面，内容区 `max-w-6xl`（Tailwind，约 72rem / 1152px），水平居中 `mx-auto` |
| 页面边距 | 弹窗内边距 | 内容区 `px-6`（左右各 24px），导航栏 `px-8` |
| 卡片间距 | 弹窗内紧凑 | 卡片之间 `gap-6`（24px），顶栏到内容 `pt-6` |
| 表单布局 | 单列窄 | **`grid grid-cols-3 gap-4`**（3 列等宽，列间距 16px），宽字段（备注/地址）独占整行 `col-span-3` |
| 顶部 | 弹窗标题 | 页面标题 + 「← 返回列表」按钮 |
| 底部 | 弹窗内按钮 | **页面底部固定操作栏** `sticky bottom-0`（保存/取消） |
| 浏览器后退 | 弹窗关闭 | 浏览器后退键返回列表 |

**关键尺寸（Tailwind 类名，AI 可直接套用）**：

```
页面结构：
<div className="min-h-screen bg-gray-50">
  <PageHeader />                          ← 全宽导航栏
  <div className="max-w-6xl mx-auto px-6 pt-6 flex flex-col gap-6">
    <Card>  ← OCR 模块
    </Card>
    <Card>  ← 表单模块
      <form className="grid grid-cols-3 gap-4">
    </Card>
  </div>
  <div className="sticky bottom-0 ...">  ← 固定保存栏
  </div>
</div>
```

**理由**：弹窗套弹窗体验差（人员录入弹窗里再开 OCR 弹窗），小屏无法操作，表单字段拥挤，独立页面才能容纳 OCR + 表单 + 大字可复制区。`max-w-6xl`（约 1152px）在 1920×1080 屏幕上正好占 60% 宽度，左右留白不拥挤，且 OCR 卡片和表单卡片**同宽**。

**适用范围**：所有后续需要新增/编辑的业务页面（人员、设备、隐患、危大工程、培训记录、验收记录等），全部按这个模式做。

#### 12.7.2 OCR 弹窗取消，改在表单页面顶部常驻

**OCR 模块作为表单页面顶部的常驻卡片**，不再单独弹窗。OCR 卡片和表单卡片**同宽**（都在 `max-w-6xl` 容器内）。

```
┌──────────────────────────────────────────────────────────────────┐
│ 顶部导航栏（全宽）                                                  │
├──────────────────────────────────────────────────────────────────┤
│   ← 返回人员列表                                                   │
│   新增人员                                                         │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📷 拍照识别身份证（OCR 常驻卡片，和下方表单同宽）              │ │
│ │ ┌────────────────┐  ┌───────────────────────────────────┐    │ │
│ │ │                │  │ OCR 识别文字（可编辑、可选中复制）  │    │ │
│ │ │  [身份证图]    │  │ textarea 高 ≥ 300px               │    │ │
│ │ │                │  │                                   │    │ │
│ │ │  [缩放] [旋转] │  │                                   │    │ │
│ │ │  [重新拍照]    │  │                                   │    │ │
│ │ └────────────────┘  └───────────────────────────────────┘    │ │
│ │ [复制全部] [重新识别] [清空]                                    │ │
│ │ 建议填入：姓名 → [填入]  身份证号 → [填入]  性别 → [填入]     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ 人员信息                                                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ┌──────────┬──────────┬──────────┐                           │ │
│ │ │ 姓名*    │ 性别     │ 民族     │  ← grid-cols-3 gap-4     │ │
│ │ │ [______] │ [男 ▼]   │ [汉  ▼]  │                           │ │
│ │ ├──────────┼──────────┼──────────┤                           │ │
│ │ │ 身份证号  │ 联系电话 │ 工种     │                           │ │
│ │ │ [______] │ [______] │ [选择 ▼] │                           │ │
│ │ ├──────────┼──────────┼──────────┤                           │ │
│ │ │ 进场日期  │ 所属分包 │ 住址     │                           │ │
│ │ │ [日期]    │ [选择 ▼] │ [______] │                           │ │
│ │ ├──────────┴──────────┴──────────┤                           │ │
│ │ │ 备注                            │  ← col-span-3 宽字段    │ │
│ │ │ [___________________________]   │                           │ │
│ │ └────────────────────────────────┘                           │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ← 页面底部固定栏（sticky bottom-0）→                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                    [取消]      [保存]        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### 12.7.3 OCR 识别策略：OCR + 人工确认（3 层架构）

放弃"OCR 100% 自动填表"的目标，改用 3 层架构：

| 层级 | 角色 | 能力 | 局限 |
|------|------|------|------|
| 第 1 层 | tesseract.js OCR 引擎 | 把图片变文字 | 不知道文字的业务含义，会字形误识（如「姓名」→「妆名」） |
| 第 2 层 | 业务规则校验 | 过滤明显错误（姓氏名白名单、身份证号校验码、常见塔吊型号词典）| 不能理解上下文 |
| 第 3 层 | 人工确认 | 啥都知道 | 慢 5-10 秒 |

**具体实现**：

1. **OCR 结果展示**：可编辑 textarea（≥ 300px 高），用户可全选、复制、修改
2. **置信度分级**：
   - < 40%：不自动填，标红"识别失败"
   - 40-70%：显示候选，标黄"待确认"
   - > 70%：直接填入
3. **业务规则校验**（`src/services/ocr-validators.ts`）：
   - 姓氏白名单：100+ 常见姓
   - 身份证号：GB 11643 校验码算法
   - 设备型号：常见塔吊型号词典（QTZ40-QTZ400）
   - 设备名称中英文映射：TOWER CRANE → 塔式起重机
4. **建议填入列表**：用正则从 OCR 文本提候选字段（即使 OCR 文本里有错字，正则仍能匹配正确字段）
5. **"→ 填入"按钮**：每个建议旁加按钮，用户一键填入

#### 12.7.4 数据模型与 OCR 字段的差距（v5.1 待补）

Day 1 真机测试发现 WPS 金山文档的 18 张表比 db.ts 字段丰富得多，**OCR 能识别出来但 db.ts 没地方存**的字段：

**Equipment 表缺**（铭牌能识别但存不下）：
- `code`（设备编号/车牌）
- `manufactureLicense`（制造许可证号）
- `ratedTorque`（额定起重力矩）
- `maxLoad`（最大起重量）
- `workingRadius`（工作幅度）
- `powerSpec`（电源参数）
- `manufacturer`（制造商）
- `productionDate`（出厂日期）
- `productNo`（产品编号）
- 附件：设备图片、行驶证、保险单、一车一档 URL

**Worker 表缺**（身份证能识别但存不下）：
- 身份证正反面附件（`idCardFront`/`idCardBack`）
- `age`（年龄，可从 idCard 推算但缺独立字段）
- `hukou`（户籍）
- `education`（文化程度）
- `physicalExam`（体检信息：日期/机构/结果/报告）
- `workerType`（人员类型：固有/临时）
- `signature`（签字照片）
- `bankCard`（银行卡号）
- **关联反向字段**：`educationRecordIds`（关联教育）、`equipmentIds`（关联设备）

**Equipment.operatorId → operatorIds**：当前是一对一，WPS 是多对多（一人操作多设备）

**v5.1 计划**（不阻塞 v5.0）：
- 见 `WPS-vs-dbTS-字段对比分析.md`（生成于 2026-07-13）
- v5.0 阶段铭牌识别结果中**没对应字段的参数**先填入 `remark` 备注字段
- v5.1 集中补字段和新增 5 张 P0 表（任务、项目人员、爆破管理、危大周报、专家库）

#### 12.7.5 验证用真实样本

OCR 调优和回归测试必须用以下真实样本（存到 `src/services/__tests__/fixtures/`）：

- `idcard-dengguoyun.png` — 邓国云身份证（验证姓名字段不出现「妆名」误识）
- `nameplate-qtz80.png` — QTZ80 塔吊铭牌（验证型号「QTZ80」提取正确）
- `nameplate-qtz50.png` — QTZ50 塔吊铭牌（验证制造商信息保留到 remark）

---

> v5.0 是一次"做减法"的胜利——不是加更多功能，而是聚焦最痛的一个点：安全施工日志。
> 当你能用一段语音 + 一张照片，2 分钟内生成当天日志时，v5.0 就成功了。
