# 溜哥安全管理平台 — 项目规格说明书 (SPEC)

> 项目名称：溜哥安全管理平台（Liuge Safety Platform）
> 版本：V5.0（改造目标）
> 技术栈：React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + shadcn/ui + Dexie（本地数据库）
> 运行环境：Windows 桌面端（Vite 本地服务器，浏览器打开）

---

## 一、项目背景与定位

溜哥安全管理平台是一个面向**机场改扩建工程**的安全管理桌面应用，覆盖从人员管理、安全教育、隐患排查到文档生成的完整安全管理链条。系统以**本地数据库 + 浏览器前端**的轻量架构运行，数据存储在用户本机，无需部署服务器。

### 核心定位

- 面向施工项目的安全管理台账系统
- 支持 Word/Excel 模板驱动的高效文档生成
- 本地优先、离线可用、轻量部署

---

## 二、技术栈明细

| 层面 | 技术 | 用途 |
|------|------|------|
| 框架 | React 18 | UI 组件化开发 |
| 语言 | TypeScript 5.3 | 类型安全 |
| 构建 | Vite 5 | 开发服务器 + 打包 |
| 样式 | Tailwind CSS 3 + tailwindcss-animate | 原子化 CSS |
| 组件库 | shadcn/ui（基于 Radix UI） | UI 基础组件 |
| 路由 | react-router-dom 6 | 页面路由 |
| 状态管理 | zustand 4 | 全局状态 |
| 数据库 | Dexie 4（IndexedDB 封装） | 本地离线存储 |
| 文档生成 | docxtemplater 3.47 + PizZip | Word 模板引擎 |
| Excel 生成 | exceljs / xlsx + JSZip | Excel 模板引擎 |
| Word 编辑器 | @eigenpal/docx-editor-react | Word 在线编辑 |
| AI 集成 | openai SDK + jieba 分词 | AI 辅助生成 |
| 图标 | lucide-react | 图标系统 |
| 表单 | react-hook-form + zod | 表单验证 |
| 日期 | date-fns | 日期处理 |
| 图表 | chart.js + react-chartjs-2 | 数据可视化 |
| 虚拟滚动 | @tanstack/react-virtual | 大数据列表 |

---

## 三、架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                   React 18 SPA (Vite)                        │
├─────────────────────────────────────────────────────────────┤
│  路由层 (react-router-dom) → 页面入口                        │
├─────────────────────────────────────────────────────────────┤
│  业务页面层 (pages/)                                         │
│  项目管理 | 人员管理 | 安全教育 | 培训 | 安全日志            │
│  隐患排查 | 危险源 | 作业许可 | 验收 | 模板库 | 编辑器     │
│  统计看板 | 报表中心 | AI助手 | 知识库 | 设置               │
├─────────────────────────────────────────────────────────────┤
│  组件层 (components/)                                        │
│  布局组件 | 业务组件 | UI 基础组件                           │
├─────────────────────────────────────────────────────────────┤
│  服务层 (services/)                                          │
│  CRUD 服务 | 模板生成服务 | 日报服务 | 导入导出服务         │
├─────────────────────────────────────────────────────────────┤
│  数据库层 (db/)                                              │
│  Dexie ORM | Repository 模式                                 │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (浏览器本地数据库)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 架构特点

1. **Repository 模式**：所有数据库操作通过 `BaseRepository<T>` 泛型基类封装，业务模块使用具体 Repository 实例
2. **Service 层服务**：每个业务模块有对应的 Service 单例，封装 CRUD + 业务逻辑
3. **自定义 Hook**：页面逻辑封装在 `hooks/` 目录下，组件保持纯 UI
4. **TypeScript 全类型覆盖**：所有数据模型、API 参数都有类型定义

---

## 四、数据库设计

### 4.1 数据库名
`liuge_safety`（Dexie IndexedDB）

### 4.2 表结构（30 张表）

#### 基础管理
| 表名 | 用途 | 关键索引字段 |
|------|------|-------------|
| `projects` | 项目信息 | name, code, status |
| `subcontractors` | 分包单位 | name, projectId |
| `workers` | 人员信息 | name, idCard, projectId, status |
| `certificates` | 人员证书 | workerId, certType, expiryDate |

#### 安全过程
| 表名 | 用途 | 关键索引字段 |
|------|------|-------------|
| `educationRecords` | 安全教育记录 | date, type, projectId |
| `trainingRecords` | 培训记录 | date, type, projectId |
| `dailyLogs` | 安全日志/日报 | date, projectId |
| `hazards` | 隐患排查 | level, status, projectId |
| `hazardSources` | 危险源辨识 | category, level, projectId |
| `dangerousProjects` | 危大工程 | category, level, projectId |
| `workPermits` | 作业许可 | type, status, projectId |
| `acceptances` | 验收管理 | type, date, projectId |
| `meetings` | 会议管理 | type, date, projectId |
| `correspondences` | 文件来往 | direction, type, projectId |

#### 模板与文档
| 表名 | 用途 | 关键索引字段 |
|------|------|-------------|
| `categories` | 模板分类 | 树形结构（parentId） |
| `templates` | 模板（含变量映射） | name, categoryId |
| `aiGenerations` | AI 生成记录 | type, status, projectId |

#### 安全物资
| 表名 | 用途 | 关键索引字段 |
|------|------|-------------|
| `ppeItems` | 劳保用品 | 标准 CRUD |
| `equipment` | 机械设备 | 标准 CRUD |
| `emergencyPlans` | 应急预案 | 标准 CRUD |
| `emergencySupplies` | 应急物资 | 标准 CRUD |
| `emergencyDrills` | 应急演练 | 标准 CRUD |
| `safetyCosts` | 安全费用 | 标准 CRUD |
| `accidentRecords` | 事故记录 | 标准 CRUD |
| `penalties` | 处罚记录 | 标准 CRUD |

#### AI 与系统
| 表名 | 用途 | 关键索引字段 |
|------|------|-------------|
| `aiChatMessages` | AI 聊天消息 | sessionId |
| `aiSessions` | AI 会话 | lastMessageAt |
| `knowledgeItems` | 知识库条目 | title, category |
| `knowledgeDocuments` | 知识库文档 | 标准 CRUD |
| `knowledgeChunks` | 知识库切片 | 标准 CRUD |
| `dictItems` | 字典数据 | category, code |
| `settings` | 系统设置（键值对） | key |

---

## 五、模块功能清单

### 5.1 已完成模块

| 模块 | 路由 | 功能状态 |
|------|------|---------|
| 首页 | `/home` | 项目概览、快捷入口 |
| 项目管理 | `/projects` | 项目增删改查，扩展字段 |
| 分包管理 | `/subcontractors` | 分包单位 CRUD |
| 人员管理 | `/workers` | 人员 CRUD + 证书管理 |
| 安全教育 | `/education` | 记录 CRUD，含参会人员 |
| 培训管理 | `/training` | 记录 CRUD，含参会人员 |
| 安全日志 | `/dailylog` | 基础 CRUD |
| 隐患排查 | `/inspection` | 隐患 CRUD + 整改流程 |
| 危险源辨识 | `/hazard-identification` | 危险源 CRUD |
| 危大工程 | `/hazard-project` | 危大工程 CRUD |
| 作业许可 | `/permits` | 8 种作业许可管理 |
| 验收管理 | `/acceptance` | 验收记录 |
| 会议管理 | `/meetings` | 会议记录 |
| 文件来往 | `/correspondences` | 收发文管理 |
| 统计看板 | `/statistics` | 数据可视化 |
| 报表中心 | `/reports` | 报表列表 |
| 模板库 | `/templates` | 模板 + 分类树 + 变量配置 + 生成 |
| 日报 | `/report/daily` | 结构化日报 |
| AI 助手 | `/ai` | AI 对话 |
| 知识库 | `/knowledge` | 知识管理 |
| Word 编辑器 | `/editor/docx` | Word 在线编辑 |
| Excel 编辑器 | `/editor/xlsx` | Excel 在线编辑 |
| 劳保用品 | `/ppe` | PPE 管理 |
| 机械设备 | `/equipment` | 设备管理 |
| 应急管理 | `/emergency` | 预案+物资+演练 |
| 事故记录 | `/accidents` | 事故管理 |
| 安全费用 | `/safety-cost` | 费用管理 |
| 系统设置 | `/settings` | 全局变量配置 |
| 变量设置 | `/settings/variables` | 变量管理 |

### 5.2 模板与文档生成系统（核心特色功能）

这是项目的核心能力，设计较为复杂，需要特别理解。

#### 整体流程

```
用户导入 Word/Excel 模板文件
    ↓
系统解析模板 → 自动提取 {{变量名}} 占位符
    ↓
用户配置变量映射（设置每个变量的来源）
    ↓
用户点击"生成" → 系统替换变量值 → 输出最终文档
    ↓
同时可将数据写入业务表（如安全日志表）
```

#### 变量系统（9 种来源）

| 来源类型 | 说明 | 示例 |
|---------|------|------|
| `field` | 项目表字段值 | 项目名称、项目经理 |
| `extraField` | 项目扩展字段 | 设计单位、安全负责人 |
| `formula` | 公式拼接 | 多个变量用 + 连接 |
| `currentDate` | 当前日期 | 自动填入当天日期 |
| `currentUser` | 当前用户 | 从系统设置读取 |
| `related` | 关联列表数据 | 隐患清单、人员清单 |
| `manual` | 手动填写（含默认值） | 用户生成时输入 |
| `statistic` | 统计数据（预留） | — |
| `ai` | AI 生成（预留） | — |

#### 变量映射数据结构（VariableMapping）

```typescript
interface VariableMapping {
  name: string           // 变量名（对应模板中的 {{name}}）
  label?: string         // 显示名（中文）
  source: 'field' | 'extraField' | 'statistic' | 'related' | 'ai' | 'currentUser' | 'currentDate' | 'formula' | 'manual'
  table?: string         // 来源表（如 'projects'）
  field?: string         // 来源字段（如 'name'）
  extraFieldKey?: string // 扩展字段键名
  format?: string        // 日期格式（如 'YYYY-MM-DD'）
  expr?: string          // 公式表达式
  queryKey?: string      // 关联查询 key
  defaultValue?: string  // 手动变量默认值
  required?: boolean     // 是否必填
}
```

#### 文档生成引擎

- **Word (docx)**：docxtemplater + PizZip，替换 `{{变量名}}` 占位符
- **Excel (xlsx)**：JSZip 遍历 XML，替换 `{{变量名}}` 占位符
- **批量生成**：支持多模板批量生成，打包为 ZIP 下载
- **手动变量交互**：生成时弹出填写弹窗，用户补充手动变量

### 5.3 模板编辑器（在线编辑）

- 使用 `@eigenpal/docx-editor-react` 第三方库
- 支持在浏览器中编辑 Word 文档
- 支持插入变量占位符 `{{变量名}}`
- 右侧变量配置面板可进行变量映射设置

---

## 六、变量配置编辑器 UI 设计

### 6.1 布局设计

变量配置面板采用**卡片式布局**，每个变量是一个独立卡片：

```
┌─────────────────────────────────────────┐
│ 变量配置                   10 个变量     │
├─────────────────────────────────────────┤
│ [搜索变量...]                    [+ 添加] │
│ [提取变量] [全部插入]   已匹配 8 / 未匹配 2 │
├─────────────────────────────────────────┤
│ ┌─ 卡片 ──────────────────────────────┐ │
│ │ 变量名称              [编辑✏️] 已匹配 │ │
│ │ {{显示名}}                           │ │
│ │ [手动填写🔵] [▼ manual] [默认值输入]  │ │
│ └─────────────────────────────────────┘ │
│ ┌─ 卡片 ──────────────────────────────┐ │
│ │ 项目名称               [编辑✏️] 已匹配 │ │
│ │ {{项目名称}}                         │ │
│ │ [项目字段🔵] [▼ field] [▼ 项目名称]   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 6.2 颜色规范

- **手动填写**：琥珀色 badge（`bg-amber-50 text-amber-700`）
- **项目字段**：蓝色 badge（`bg-blue-50 text-blue-700`）
- **当前日期**：绿色 badge（`bg-green-50 text-green-700`）
- **人员选择（新增）**：紫色 badge（`bg-purple-50 text-purple-700`）
- **已匹配/未匹配**：绿色/红色文字
- **选中卡片**：紫色 ring（`ring-2 ring-purple-400`）

---

## 七、当前已修复的问题

### 7.1 已修复
1. **模板分类管理**：分类树新增/编辑/删除功能
2. **变量输入限制**：只能输入一个字符的问题
3. **Word 加载超时**：增加 8s 超时保护和重试机制
4. **Excel 生成报错**：增加单独的文件类型检测和渲染逻辑
5. **@node-rs/jieba 编译错误**：增加 Vite alias 桩模块
6. **默认值显示**：默认值输入框布局修复，多个默认值叠在一起问题
7. **模板分类大小**：分类树宽度从 180px → 220px

### 7.2 待完成（V5.0 改造目标）

1. **变量生成关联项目**：确保 `field` 类型变量正确读取当前项目数据
2. **编辑器插入变量按钮**：变量配置面板的插入功能对接编辑器光标位置
3. **变量类型扩展**：新增 `workerSelect`（人员选择）类型
4. **人员选择对话框**：新建 `WorkerSelectDialog` 组件，支持多选
5. **安全日志生成 MVP**：
   - 安全日志表单（日期、天气、记录人、内容、参加人员等）
   - 生成 Word 同时写入 `dailyLogs` 表
   - 约定的变量名映射（`日期`、`天气`、`参加人员`等）
6. **服务稳定性**：解决 Vite 开发服务器频繁崩溃问题

---

## 八、目录结构

```
f:\安全管理平台\
├── src/
│   ├── components/
│   │   ├── business/         # 业务组件（CategoryTreeNew, VariableMappingEditor 等）
│   │   ├── editors/          # 编辑器（DocxEditor, XlsxEditor）
│   │   ├── layout/           # 布局组件（AppLayout, Header, Sidebar）
│   │   └── ui/               # shadcn/ui 基础组件
│   ├── config/               # 配置（features.ts, menu.tsx）
│   ├── core/                 # 核心常量
│   ├── db/                   # 数据库层
│   │   ├── index.ts          # Dexie 数据库定义
│   │   ├── repositories/     # 仓库实现
│   │   │   ├── base.repo.ts  # 基础仓库类
│   │   │   ├── category.repo.ts
│   │   │   └── template.repo.ts
│   │   ├── repositories.ts   # 所有仓库实例导出
│   │   └── seed.ts           # 种子数据
│   ├── lib/                  # 工具库
│   ├── pages/                # 页面
│   │   ├── projects/         # 项目管理
│   │   ├── workers/          # 人员管理
│   │   ├── education/        # 安全教育
│   │   ├── training/         # 培训管理
│   │   ├── dailylog/         # 安全日志
│   │   ├── templates/        # 模板库（含 hooks/ + components/）
│   │   ├── editor/           # 编辑器页面
│   │   ├── ...               # 其他业务模块
│   │   └── settings/         # 设置
│   ├── services/             # 业务服务层（30+ 个服务）
│   │   ├── generate.service.ts  # 模板生成服务
│   │   ├── projectService.ts
│   │   ├── workerService.ts
│   │   └── ...
│   ├── store/                # zustand 状态管理
│   ├── stubs/                # 桩模块（jieba 分词）
│   ├── types/                # 类型定义
│   │   ├── db.ts             # 数据模型
│   │   ├── enums.ts          # 枚举
│   │   └── index.ts          # 统一导出
│   ├── App.tsx               # 路由配置
│   ├── main.tsx              # 入口
│   └── index.css             # 全局样式
├── vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── index.html
```
