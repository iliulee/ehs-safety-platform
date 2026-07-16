# 金山文档 vs db.ts 字段对比分析报告

> 分析日期：2026-07-13
> 对比对象：金山文档「大理机场项目EHS助手」18 张表 vs `src/types/db.ts` + `src/db/index.ts`

---

## 一、db.ts 现有表一览（Dexie 存储共 29 张表）

| # | 接口名 | Dexie 表名 | 说明 |
|---|--------|-----------|------|
| 1 | `Project` | `projects` | 实施项目 |
| 2 | `Subcontractor` | `subcontractors` | 分包商 |
| 3 | `Worker` | `workers` | 劳务人员 |
| 4 | `Certificate` | `certificates` | 证书/持证 |
| 5 | `EducationRecord` | `educationRecords` | 进场教育 |
| 6 | `TrainingRecord` | `trainingRecords` | 培训记录 |
| 7 | `DailyLog` | `dailyLogs` | 安全施工日志 |
| 8 | `Penalty` | `penalties` | 处罚记录 |
| 9 | `Hazard` | `hazards` | 隐患排查/上报 |
| 10 | `HazardSource` | `hazardSources` | 危险源清单 |
| 11 | `DangerousProject` | `dangerousProjects` | 危大工程登记 |
| 12 | `WorkPermit` | `workPermits` | 作业许可 |
| 13 | `Acceptance` | `acceptances` | 验收记录 |
| 14 | `Meeting` | `meetings` | 会议记录 |
| 15 | `Correspondence` | `correspondences` | 来往函件 |
| 16 | `CategoryRecord` | `categories` | 分类目录 |
| 17 | `Template` | `templates` | 模板库 |
| 18 | `AiChatMessage` | `aiChatMessages` | AI 对话消息 |
| 19 | `AiSession` | `aiSessions` | AI 会话 |
| 20 | `KnowledgeItem` | `knowledgeItems` | 知识条目 |
| 21 | `KnowledgeDocument` | `knowledgeDocuments` | 知识文档 |
| 22 | `KnowledgeChunk` | `knowledgeChunks` | 知识分块 |
| 23 | `AiGeneration` | `aiGenerations` | AI 生成记录 |
| 24 | `DictItem` | `dictItems` | 字典项 |
| 25 | `SettingItem` | `settings` | 系统设置 |
| 26 | `PpeItem` | `ppeItems` | 劳保用品（库存） |
| 27 | `Equipment` | `equipment` | 机械设备 |
| 28 | `EmergencyPlan` / `EmergencySupply` / `EmergencyDrill` | `emergencyPlans/Supplies/Drills` | 应急管理 |
| 29 | `AccidentRecord` | `accidentRecords` | 事故管理 |
| 30 | `SafetyCost` | `safetyCosts` | 安全费用 |

---

## 二、WPS 表 → db.ts 表映射关系

| # | WPS 表名 | 记录数 | db.ts 对应表 | 映射关系 |
|---|---------|--------|-------------|----------|
| 1 | 任务 | 207 | **无直接对应** | db.ts 无独立的"任务"表；WorkPermit/Acceptance 部分涉及但语义不同 |
| 2 | 危大工程登记 | 4 | `DangerousProject` | 强对应 |
| 3 | 实施项目 | 3 | `Project` | 强对应 |
| 4 | 项目人员 | 23 | **无直接对应** | db.ts 中 Worker(劳务人员) ≠ 项目人员（管理层），是两套不同的人群 |
| 5 | 分包商 | 53 | `Subcontractor` | 强对应 |
| 6 | 劳务人员 | 211 | `Worker` | 强对应 |
| 7 | 劳保用品领用 | 15 | **无直接对应** | `PpeItem` 是库存管理，不是领用记录 |
| 8 | 进场教育 | 34 | `EducationRecord` | 中等对应 |
| 9 | 培训记录 | 7 | `TrainingRecord` | 强对应 |
| 10 | 事故事件登记 | 17 | `AccidentRecord` | 强对应 |
| 11 | 设备档案 | 30 | `Equipment` | 强对应 |
| 12 | 设备点检单 | 3 | **无直接对应** | db.ts 无设备点检表 |
| 13 | 隐患排查计划和执行 | 9 | `Hazard`（部分重叠） | 弱对应：Hazard 是"隐患条目"，缺少"排查计划"维度 |
| 14 | 危险源清单（月度） | 0 | `HazardSource` | 强对应 |
| 15 | 隐患上报和整改 | 81 | `Hazard`（部分重叠） | 中等对应：WPS 的隐患上报表比 db.ts Hazard 多很多字段 |
| 16 | 危大方案专家库 | 34 | **无直接对应** | db.ts 无专家库表 |
| 17 | 危大周报 | 350 | **无直接对应** | db.ts 无危大周报表 |
| 18 | 爆破管理 | 96 | **无直接对应** | db.ts 无爆破管理表（WorkPermit 有 blasting 类型但不等价） |

---

## 三、db.ts 每张已有表**缺失的字段**

### 3.1 `Project`（对应 WPS「实施项目」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 部门名称 | 有（`name`） | - |
| 推进状态 | 有（`status`） | - |
| 竣工日期 | 有（`endDate`） | - |
| 任务完成度 | **缺失** | WPS 有独立的任务完成度字段 |
| 关联任务 | **缺失** | db.ts 无任务表 |
| 负责人 | 有（`managerName`） | - |
| 项目类型（EPC/施工总承包等） | **缺失** | db.ts 无此枚举 |
| 合同金额 | **缺失** | - |
| 项目经理/电话 | 有（`managerName` / `safetyOfficerPhone`，但不是项目经理电话） | **缺失项目经理电话** |
| 三级教育人数 | **缺失** | - |
| 劳务人数 | **缺失** | - |
| 分包 | **缺失** | - |
| 安全人员缺口 | **缺失** | - |
| 保险（工程一切险/安责险/工伤险截止日） | **缺失** | - |

### 3.2 `Worker`（对应 WPS「劳务人员」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 分包单位 | 有（`subcontractorId`） | - |
| 岗位（多选） | 部分（`workType` 单值） | **缺失多选支持** |
| 姓名 | 有（`name`） | - |
| 身份证号 | 有（`idCard`） | - |
| 性别 | 有（`gender`） | - |
| 年龄 | **缺失** | 可从身份证推算，但无独立字段 |
| 户籍 | **缺失** | db.ts 有 `nation` 民族，但无户籍 |
| 住址 | 有（`address`） | - |
| 电话 | 有（`phone`） | - |
| 文化程度 | **缺失** | - |
| 员工照片 | 有（`avatar`） | - |
| 职业危害史 | **缺失** | - |
| 进场/退场时间 | 有（`entryDate`/`exitDate`） | - |
| 体检（日期/机构/结果/报告） | **缺失** | 无体检相关字段 |
| 人员类型（固有/临时） | **缺失** | - |
| 签字照片 | **缺失** | - |
| 银行卡号 | **缺失** | - |
| 持证情况 | 有（通过 `Certificate` 子表关联） | - |
| 作业资格证 | 有（`Certificate.certType`） | - |
| 身份证正反面 | **缺失** | 无附件字段 |
| **关联进场教育(Link)** | **缺失** | db.ts Worker 无 educationRecordIds 字段 |
| **关联设备档案(Link)** | **缺失** | db.ts Worker 无 equipmentIds 字段 |

### 3.3 `Subcontractor`（对应 WPS「分包商」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 公司名称 | 有（`name`） | - |
| 日期 | **缺失** | 无登记/合作日期 |
| 安全重视等级（Rating） | **缺失** | db.ts 无评级字段 |

### 3.4 `EducationRecord`（对应 WPS「进场教育」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 人员来源（新员工三级/转岗/班组转岗） | **缺失** | db.ts 有 `type` 但语义不同 |
| 受教人员(Link→劳务人员) | 有（`attendeeIds`） | - |
| 三级教育签名(附件) | **缺失** | 无签名附件字段 |
| 完成时间 | 有（`date`） | - |
| 技术交底签名/日期 | **缺失** | - |
| 四不伤害签名/日期 | **缺失** | - |
| 确认通过（完成/未完成） | **缺失** | db.ts 无审核状态 |
| 考试合格证明(附件) | 有（`attachments`，通用附件） | 但无专门的考试证明字段 |

### 3.5 `TrainingRecord`（对应 WPS「培训记录」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 培训编号 | **缺失** | db.ts 用 id 代替 |
| 时间 | 有（`date`） | - |
| 讲师 | 有（`trainer`） | - |
| 类型（技术/安全） | 有（`type`） | - |
| 级别（班组/分公司/项目/公司） | **缺失** | - |
| 主题 | **缺失** | db.ts 用 title 代替 |
| 内容 | 有（`content`） | - |
| 受训对象 | 部分（`attendeeIds` 是人员ID列表，非 OneWay 关联） | WPS 关联到劳务人员/分包商 |
| 课件(URL) | **缺失** | - |
| 照片签到表(附件) | 有（`attachments`，通用附件） | - |
| 项目部 | 有（`projectId`） | - |

### 3.6 `Equipment`（对应 WPS「设备档案」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 设备类型(Cascade) | 有（`category`） | - |
| 编码/车牌 | **缺失** | db.ts 无编码字段 |
| 状态 | 有（`status`） | - |
| 规格型号 | 有（`model`） | - |
| 项目 | 有（`projectId`） | - |
| **驾驶员身份证(Link→劳务人员)** | **缺失** | db.ts 有 `operatorId` 但无明确关联劳务人员语义 |
| 负责人电话 | **缺失** | - |
| 分包商 | **缺失** | 无 subcontractorId |
| 备案日期 | **缺失** | - |
| 设备图片 | **缺失** | 无图片附件字段 |
| 手册(URL) | **缺失** | - |
| 点检时间/标准 | **缺失** | - |
| 进场/退场时间 | 有（`entryDate`/`exitDate`） | - |
| 商业险/年审过期日 | 有（`insuranceExpiryDate`） | 无年审过期日 |
| 行驶证/保险单(附件) | **缺失** | 无附件字段 |
| 一车一档(URL) | **缺失** | - |

### 3.7 `DangerousProject`（对应 WPS「危大工程登记」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 名称 | 有（`name`） | - |
| 所属项目 | 有（`projectId`） | - |
| 计划时间 | 有（`startDate`/`endDate`） | - |
| 参数 | **缺失** | - |
| 编制人/时间 | **缺失** | - |
| 论证专家/时间/结果 | 部分（有 `expertReview`/`expertReviewDate`） | **缺失论证结果** |
| 批准人/时间 | **缺失** | - |
| 交底人/时间 | **缺失** | - |
| 是否需论证 | 有（`expertReview`） | - |
| 等级(Ⅰ-Ⅳ) | 部分（有 `DangerousProjectLevel`，但只有 normal/over_scale 两级） | **WPS 有 4 级，db.ts 只有 2 级** |
| 进度 | 有（`status`） | - |
| 分公司 | **缺失** | - |

### 3.8 `Hazard`（对应 WPS「隐患排查计划和执行」+「隐患上报和整改」）

| WPS 字段（排查计划） | db.ts 是否有 | 说明 |
|---------------------|-------------|------|
| 编号 | **缺失** | 用 id 代替 |
| 名称 | 有（`title`） | - |
| 计划日期 | **缺失** | db.ts 无计划日期 |
| 负责人 | 部分（有 `reporterId`/`rectifyPersonId`，语义不同） | - |
| 检查类别（公司/项目日常/专项等） | **缺失** | - |
| 专项内容 | **缺失** | - |
| 检查项目 | 有（`projectId`） | - |
| 检查结果（有/无隐患） | **缺失** | - |
| 实际检查时间 | **缺失** | - |
| 限期整改时间 | 有（`rectifyDeadline`） | - |
| 检查状态 | 有（`status`） | - |
| 整改证明(附件) | **缺失** | - |

| WPS 字段（隐患上报和整改） | db.ts 是否有 | 说明 |
|--------------------------|-------------|------|
| 编号 | **缺失** | - |
| 填报范围 | **缺失** | - |
| 隐患描述 | 有（`description`） | - |
| 触发次数 | **缺失** | - |
| 重大隐患 | 部分（`level` 有 'serious'） | - |
| 等级（一般/严重/较大/重大） | 有（`level`） | WPS 有 4 级，db.ts 有 3 级 |
| 类型（违规违章/控制措施失效） | **缺失** | - |
| 原因分析 | **缺失** | - |
| 来源 | 有（`source`） | 但只区分 manual/ai，无"检查发现/自查"等 |
| 发现时间 | 有（`createdAt`） | - |
| 整改负责人/计划/实际完成时间 | 部分（有 `rectifyPersonId`/`rectifyDeadline`/`rectifyDate`） | - |
| 整改情况 | **缺失** | - |
| 整改资金 | **缺失** | - |
| 应急预案 | **缺失** | - |
| 措施验证（部门/人/时间/效果） | **缺失** | - |
| 是否关闭/关闭时间 | **缺失** | status 可部分替代 |
| 督办 | **缺失** | - |
| 整改前后照片 | 有（`photos`/`rectifyPhotos`） | - |
| 整改状态 | 有（`status`） | - |
| 罚款 | **缺失** | Penalty 表是独立表，无直接关联 |

### 3.9 `HazardSource`（对应 WPS「危险源清单（月度）」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 序号 | **缺失** | 用 id 代替 |
| 机场 | **缺失** | - |
| 流程（一/二/三级） | **缺失** | - |
| 危险源编号 | **缺失** | - |
| 描述 | 有（`name`，但缺少详细描述字段） | - |
| 重大危险源 | **缺失** | - |
| 辨识来源 | **缺失** | - |
| 诱发原因 | 有（`riskFactor`） | - |
| 后果 | **缺失** | - |
| 控制措施 | 有（`controlMeasures`） | - |
| 严重性 L / 可能性 P / 风险值 / 风险等级 | **缺失** | db.ts 只有 `level: RiskLevel`（1-4），缺 L/P 矩阵 |
| 位置 | 有（`location`） | - |

### 3.10 `AccidentRecord`（对应 WPS「事故事件登记」）

| WPS 字段 | db.ts 是否有 | 说明 |
|----------|-------------|------|
| 编号 | **缺失** | 用 id 代替 |
| 受伤员工(Lookup) | 有（`victimName`/`victimId`） | - |
| 单位 | **缺失** | - |
| 岗位 | **缺失** | - |
| 时间 | 有（`occurrenceDate`） | - |
| 描述 | 有（`description`） | - |
| 部位 | **缺失** | - |
| 伤害类型 | 有（`accidentType`） | - |
| 原因 | 有（`cause`） | - |
| 整改措施/日期 | 有（`correctiveActions`） | 无独立整改日期 |
| 验收情况/日期 | **缺失** | - |
| 身份证号 | **缺失** | 可通过 victimId 关联查找 |

---

## 四、WPS 中存在但 db.ts 完全没有的表

| # | WPS 表名 | 记录数 | 重要程度 | 说明 |
|---|---------|--------|---------|------|
| 1 | **任务** | 207 | **高** | 207 条任务数据是核心管理数据，db.ts 完全没有任务管理模块 |
| 2 | **项目人员** | 23 | **高** | 项目管理层（项目经理/安全总监/安全员等）与劳务人员是两套不同体系，db.ts 缺失 |
| 3 | **劳保用品领用** | 15 | 中 | `PpeItem` 是库存表，无领用流水记录 |
| 4 | **设备点检单** | 3 | 中 | 设备日常点检，含检查项/定位/拍照 |
| 5 | **危大方案专家库** | 34 | **高** | 34 位专家的资质信息，危大工程论证依赖此表 |
| 6 | **危大周报** | 350 | **高** | 数据量第二大的表（350 条），记录危大工程每周执行情况 |
| 7 | **爆破管理** | 96 | **高** | 机场扩建项目核心业务之一，96 条排班/炸药/雷管记录 |

---

## 五、关键关联关系分析

### 5.1 总体关联关系对照

| WPS 关联描述 | 关联类型 | db.ts 是否有对应 | 现状 |
|-------------|---------|----------------|------|
| 任务.所属项目 → 实施项目 | Link | 无（无任务表） | - |
| 任务.任务执行人 → 项目人员 | Link | 无（无任务表/项目人员表） | - |
| 危大工程登记.所属项目 → 实施项目 | Link | 有（`projectId`） | 已实现 |
| 危大周报.危大项目 → 危大工程登记 | OneWay→Link | **无**（无危大周报表） | - |
| 项目人员.关联实施项目 → 实施项目 | Link | 无（无项目人员表） | - |
| 项目人员.关联任务 → 任务 | Link | 无（无两张表） | - |
| 项目人员.关联爆破值班 → 爆破管理 | Link | 无（无两张表） | - |
| **劳务人员.分包单位 → 分包商** | **OneWay** | **有**（`subcontractorId`） | **已实现** |
| **劳务人员.关联进场教育 → 进场教育** | **Link** | **缺失**（见下文详析） | **Worker 无 educationRecordIds** |
| **劳务人员.关联设备档案 → 设备档案** | **Link** | **缺失**（见下文详析） | **Worker 无 equipmentIds** |
| 劳保用品领用.领用人身份证 → 劳务人员 | OneWay | 无（无领用表） | - |
| 进场教育.受教人员 → 劳务人员 | Link | 反向有（`EducationRecord.attendeeIds`） | **方向相反** |
| 培训记录.受训对象 → 劳务人员 | OneWay | 反向有（`TrainingRecord.attendeeIds`） | **方向相反** |
| 事故事件登记.受伤员工 → 劳务人员 | Lookup | 反向有（`AccidentRecord.victimId`） | 方向相反 |
| 设备档案.驾驶员身份证 → 劳务人员 | Link | 部分（`operatorId`） | 未明确关联劳务人员语义 |
| 隐患排查.检查项目 → 实施项目 | Link | 有（`Hazard.projectId`） | 已实现 |

### 5.2 四条重点关联详析

#### 关联 1：劳务人员 ↔ 进场教育

| 维度 | WPS 设计 | db.ts 现状 | 差距 |
|------|---------|-----------|------|
| 关联方向 | 劳务人员 → 进场教育（Link，多对多） | 反向：EducationRecord.attendeeIds → Worker | **方向相反，但功能等价** |
| 具体实现 | 劳务人员表上有"关联进场教育"字段 | EducationRecord.attendeeIds 存的是 worker ID 数组 | 查询方向不同，WPS 从人员查教育，db.ts 从教育查人员 |
| 是否需要改造 | - | **可选优化**：在 Worker 上加 `educationRecordIds?: string[]` 方便从人员维度查询 |
| 风险 | - | 低。通过 `educationRecords.where('attendeeIds').equals(workerId)` 可反向查 |

#### 关联 2：劳务人员 ↔ 设备档案

| 维度 | WPS 设计 | db.ts 现状 | 差距 |
|------|---------|-----------|------|
| 关联方向 | 劳务人员 → 设备档案（Link，多对多） | 反向：Equipment.operatorId → Worker（**仅一对一**） | **严重缺失** |
| 具体实现 | 一个劳务人员可关联多台设备（操作多台设备） | Equipment.operatorId 只支持一个操作员 | **一对一 vs 多对多** |
| WPS 业务含义 | 驾驶员/操作员可操作多台设备 | db.ts 假设一人操作一台设备 | 不符合实际业务 |
| 是否需要改造 | - | **必须改造**：Equipment.operatorId 改为 operatorIds 数组，或 Worker 上加 equipmentIds |
| 建议 | - | 方案 A：`Equipment.operatorId` → `Equipment.operatorIds: string[]`；方案 B：Worker 加 `equipmentIds: string[]` |

#### 关联 3：实施项目 ↔ 分包商

| 维度 | WPS 设计 | db.ts 现状 | 差距 |
|------|---------|-----------|------|
| 关联方向 | 实施项目表内嵌字段 | Subcontractor.projectId → Project | **方向相反，但功能等价** |
| 具体实现 | WPS 实施项目表有"分包"字段（文本/列表） | Subcontractor.projectId 是外键关联 | db.ts 用外键方式，更规范 |
| 是否需要改造 | - | **不需要**。通过 `subcontractors.where('projectId').equals(projectId)` 可查出某项目的所有分包商 |
| 风险 | - | 无。当前设计合理 |

#### 关联 4：隐患排查计划 ↔ 隐患上报和整改

| 维度 | WPS 设计 | db.ts 现状 | 差距 |
|------|---------|-----------|------|
| 关联方向 | 两张独立表（排查计划 → 隐患上报，一对多） | 合并为一张 `Hazard` 表 | **表结构差异大** |
| WPS 设计理念 | 排查计划 → 执行 → 发现隐患 → 生成隐患上报单 → 整改 → 验收 | 一个 Hazard 条目包含"发现-整改-复查"全流程 | **WPS 区分"计划"和"结果"，db.ts 合并处理** |
| 计划维度 | 排查计划有：计划日期、检查类别、专项内容、检查结果（有无隐患） | db.ts 无计划维度，直接录入隐患 | **缺失"排查计划"层** |
| 上报维度 | 隐患上报有：填报范围、触发次数、原因分析、整改资金、督办、罚款 | db.ts Hazard 缺少这些字段 | **缺失大量字段** |
| 关联方式 | 排查计划.id → 隐患上报.来源计划 | **无对应**（单表无法自关联） | - |
| 是否需要改造 | - | **建议拆分**：新增 `InspectionPlan`（排查计划表），Hazard 保留隐患上报整改功能，Hazard 加 `planId` 外键 |
| 建议 | - | 新增 InspectionPlan 表含：名称、计划日期、负责人、检查类别、专项内容、检查项目、实际检查时间、检查结果、检查状态、整改证明 |

---

## 六、总结与优先级建议

### 紧急度高（直接影响核心业务闭环）

| 优先级 | 改造项 | 工作量 | 说明 |
|--------|-------|--------|------|
| P0 | 新增 `Task`（任务表） | 中 | 207 条数据，是项目管理的核心载体 |
| P0 | 新增 `ProjectMember`（项目人员表） | 中 | 23 条管理层人员，与劳务人员是两套体系 |
| P0 | 新增 `BlastingManagement`（爆破管理表） | 中 | 96 条排班数据，机场扩建核心业务 |
| P0 | 新增 `DangerousWeeklyReport`（危大周报表） | 中 | 350 条数据，数据量第二大 |
| P0 | 新增 `ExpertLibrary`（危大方案专家库） | 小 | 34 条数据，危大论证依赖 |
| P1 | 拆分排查计划与隐患上报 | 大 | 建议新增 InspectionPlan 表 |

### 改造优先级中（字段补全）

| 优先级 | 改造项 | 工作量 | 说明 |
|--------|-------|--------|------|
| P1 | Worker 补全字段（体检/签字/银行卡/户籍/年龄等） | 中 | WPS 有 20+ 字段，db.ts 缺 10+ |
| P1 | Worker ↔ Equipment 多对多关联 | 小 | 改 operatorId 为 operatorIds |
| P1 | Equipment 补全字段（编码/图片/附件/分包商/一车一档） | 中 | 缺 10+ 字段 |
| P1 | Hazard 补全字段（原因分析/整改资金/督办/罚款等） | 中 | WPS 隐患上报有 20+ 字段 |
| P2 | HazardSource 补全 L/P 矩阵 | 小 | 风险评估核心字段 |
| P2 | Project 补全字段（合同金额/保险/人员缺口等） | 小 | - |
| P2 | Subcontractor 补全评级字段 | 小 | - |

### 改造优先级低（新增辅助表）

| 优先级 | 改造项 | 工作量 | 说明 |
|--------|-------|--------|------|
| P2 | 新增 `PpeIssuance`（劳保用品领用记录） | 小 | PpeItem 是库存，缺领用流水 |
| P2 | 新增 `EquipmentInspection`（设备点检单） | 小 | 含检查项/定位/拍照 |
| P3 | EducationRecord 补全（三级签名/四不伤害/审核状态） | 小 | - |
