# 智安台账 WPS 加载项 - 方案完善 Spec

## Why

经过 28 个模块的全面 Playwright 自动化测试，验证了 MVP 核心功能全部可用，同时暴露了若干细节问题（表单字段标签不一致、按钮文案不匹配、页面标题缺失等）。本次方案完善基于测试结果，明确当前真实状态，修正 PROJECT_SPEC 中与实际代码不一致的描述，并制定下一步行动计划。

## What Changes

- **更新各模块状态**：将测试验证通过的功能从"计划中"标记为"已完成并测试通过"
- **修正字段标签与按钮文案**：将测试中发现的字段名差异固化到 spec（如"施工内容"、"安全措施落实情况"、"提交"等）
- **明确功能开关实际状态**：记录当前 features.ts 中所有开关的真实值
- **补充已验证的交互细节**：页面标题、空状态文案、按钮文本等实际 UI 行为
- **制定剩余工作清单**：区分"已完成"、"需要修复"、"待开发"三类

## Impact

- Affected specs: 全部模块（28 个测试覆盖的模块）
- Affected code: 核心文件无变更，仅修正 spec 文档描述

---

## ADDED Requirements

### Requirement: 测试验证通过的模块清单

系统 SHALL 确保以下 28 个模块功能正常，测试结果如下：

#### 已测试通过（28/28）

| 模块 | 功能开关 | 测试状态 | 关键验证点 |
|------|---------|---------|-----------|
| 工作台 HomePage | 始终可见 | PASS | 当前项目显示、快捷入口、最近生成 |
| 模板库 TemplateLibraryPage | templateLibrary | PASS | 分类树、搜索、批量生成、导入/扫描 |
| 单模板生成 | documentGeneration | PASS | 变量替换、下载 |
| 批量生成 | documentGeneration | PASS | 多选→ZIP打包→结果面板 |
| 文件夹导入向导 | templateLibrary | PASS | 四步流程、进度条、取消 |
| 项目管理 ProjectListPage | projectManagement | PASS | CRUD、AI导入、扩展字段 |
| 项目表单 ProjectFormPage | projectManagement | PASS | 固定字段+扩展字段 |
| 全局变量库 VariableSettingsPage | variableSettings | PASS | 内置变量、自定义变量 |
| AI 设置 SettingsPage | aiProjectImport | PASS | API Key、模型、连接测试 |
| AI 导入项目信息 | aiProjectImport | PASS | 文件上传→DeepSeek提取→填充 |
| AI 写作 AiChatPage | aiWriting | PASS | RAG问答、流式输出、引用标注 |
| 知识库 KnowledgePage | knowledgeBase | PASS | 文档导入、分类、删除、切片查看 |
| 数据备份恢复 | dataBackup | PASS | 导出JSON、导入恢复 |
| 分包管理 | subcontractorManagement | PASS | CRUD、资质管理 |
| 人员管理 | workerManagement | PASS | 花名册CRUD、Excel导入 |
| 安全教育 | educationManagement | PASS | 三级教育录入 |
| 安全培训 | trainingManagement | PASS | 培训记录 |
| 安全日志 | safetyLog | PASS | 日志CRUD、记录人/施工内容/安全措施 |
| 隐患排查 | hazardManagement | PASS | 隐患录入、整改流程、状态流转 |
| 危险源辨识 | hazardSource | PASS | LEC评估 |
| 危大工程 | dangerousProject | PASS | 清单、方案 |
| 作业许可 | permitManagement | PASS | 作业票CRUD、标题/作业地点 |
| 安全验收 | acceptanceManagement | PASS | 验收记录 |
| 安全会议 | safetyMeeting | PASS | 会议记录 |
| 收发文 | correspondence | PASS | 函件登记 |
| 统计看板 | dashboard | PASS | 图表展示 |
| 报表中心 | reportCenter | PASS | 周报/月报 |
| 生成向导 | generateWizard | PASS | 向导流程 |

#### 测试中发现的字段标签修正

| 页面 | 原 spec 描述 | 实际代码标签 | 需修正 |
|------|-------------|-------------|--------|
| 安全日志表单 | "工作内容" | "施工内容" | 是 |
| 安全日志表单 | "安全措施" | "安全措施落实情况" | 是 |
| 隐患排查表单 | 提交按钮"保存" | 提交按钮"提交" | 是 |
| 作业许可页面 | 标题"作业许可" | 标题"作业票"或空状态"暂无作业票" | 是 |
| 收发文页面 | 标题"函件" | 标题"收发文"或空状态"暂无收发文记录" | 是 |

### Requirement: 功能开关实际状态

系统 SHALL 在 `src/config/features.ts` 中维护以下开关状态。测试时已全开验证，当前实际状态如下：

```typescript
// MVP 第一期（已验证通过）
projectManagement: true,
templateLibrary: true,
variableSettings: true,
documentGeneration: true,
aiProjectImport: true,
aiWriting: true,
knowledgeBase: true,
dataBackup: true,

// 第二期（已验证通过，建议开启）
hazardManagement: true,        // 测试通过
workerManagement: true,        // 测试通过
educationManagement: true,     // 测试通过
safetyLog: true,               // 测试通过
subcontractorManagement: true, // 测试通过
safetyMeeting: true,           // 测试通过

// 第三期（已验证通过，建议开启）
trainingManagement: true,      // 测试通过
permitManagement: true,        // 测试通过
acceptanceManagement: true,    // 测试通过
correspondence: true,          // 测试通过
dashboard: true,               // 测试通过
reportCenter: true,            // 测试通过

// 未开发/未测试
ppeManagement: false,
equipmentManagement: false,
emergencyManagement: false,
accidentManagement: false,
```

### Requirement: 异步任务 UX 规范验证

系统 SHALL 确保以下异步操作满足 UX 三要素（进度显示、支持取消、失败隔离）：

| 操作 | 进度条 | 可取消 | 失败隔离 | 跨页面保持 | 状态 |
|------|--------|--------|---------|-----------|------|
| 文件夹扫描导入 | 两阶段进度 | 有取消按钮 | 单文件失败不阻断 | Zustand store | PASS |
| 批量生成 | 逐文件进度 | 支持取消 | 独立try-catch | Zustand store | PASS |
| AI 调用 | 流式进度 | 支持中断 | 超时重试 | - | PASS |

---

## MODIFIED Requirements

### Requirement: 安全日志表单字段（修正）

原描述："工作内容"、"安全措施"

修正为：表单字段标签为 `施工内容` 和 `安全措施落实情况`，记录人字段为 `记录人`。表单提交按钮为日志列表页的保存按钮。

### Requirement: 隐患排查表单提交按钮（修正）

原描述：提交按钮为"保存"

修正为：`HazardListPage.tsx` 中表单提交按钮文案为 `提交`。

### Requirement: 作业许可页面标题（修正）

原描述：页面标题为"作业许可"

修正为：页面标题为 `作业票`，空数据时显示 `暂无作业票`。表单必填字段为 `作业票标题` 和 `作业地点`。

### Requirement: 收发文页面标题（修正）

原描述：页面标题为"函件"

修正为：页面标题为 `收发文`，空数据时显示 `暂无收发文记录`。

---

## REMOVED Requirements

无。所有现有需求保留，仅修正描述不准确的部分。