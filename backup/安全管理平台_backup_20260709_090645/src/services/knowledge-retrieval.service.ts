import { db, generateId, now } from '@/db'
import type { KnowledgeItem } from '@/types'

const BUILT_IN_KNOWLEDGE: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '《安全生产法》核心要点',
    category: 'law',
    content: '生产经营单位主要负责人职责：1.建立健全并落实本单位全员安全生产责任制，加强安全生产标准化建设；2.组织制定并实施本单位安全生产规章制度和操作规程；3.组织制定并实施本单位安全生产教育和培训计划；4.保证本单位安全生产投入的有效实施；5.组织建立并落实安全风险分级管控和隐患排查治理双重预防工作机制，督促、检查本单位的安全生产工作，及时消除生产安全事故隐患；6.组织制定并实施本单位的生产安全事故应急救援预案；7.及时、如实报告生产安全事故。',
    tags: ['安全生产法', '主要负责人', '责任制'],
    source: '法律法规',
    isBuiltIn: true,
  },
  {
    title: '《建设工程安全生产管理条例》要点',
    category: 'law',
    content: '施工单位主要负责人依法对本单位的安全生产工作全面负责。施工单位应当建立健全安全生产责任制度和安全生产教育培训制度，制定安全生产规章制度和操作规程，保证本单位安全生产条件所需资金的投入，对所承担的建设工程进行定期和专项安全检查，并做好安全检查记录。建设工程实行施工总承包的，由总承包单位对施工现场的安全生产负总责。',
    tags: ['建设工程', '安全生产', '总承包'],
    source: '法律法规',
    isBuiltIn: true,
  },
  {
    title: '危大工程范围',
    category: 'pce',
    content: '危险性较大的分部分项工程范围：1.基坑工程：开挖深度超过3m（含3m）的基坑（槽）的土方开挖、支护、降水工程；2.模板工程及支撑体系：各类工具式模板工程，混凝土模板支撑工程，承重支撑体系；3.起重吊装及安装拆卸工程；4.脚手架工程：搭设高度24m及以上的落地式钢管脚手架工程等；5.拆除、爆破工程；6.其他：建筑幕墙安装工程，钢结构、网架和索膜结构安装工程等。',
    tags: ['危大工程', '专项方案', '专家论证'],
    source: '危大工程',
    isBuiltIn: true,
  },
  {
    title: '超过一定规模的危大工程',
    category: 'pce',
    content: '超过一定规模的危险性较大的分部分项工程：1.深基坑工程：开挖深度超过5m（含5m）的基坑（槽）的土方开挖、支护、降水工程；2.高大模板支撑体系：搭设高度8m及以上，搭设跨度18m及以上，施工总荷载15kN/m²及以上，集中线荷载20kN/m及以上；3.起重吊装：采用非常规起重设备、方法，且单件起吊重量在100kN及以上的起重吊装工程；4.附着式升降脚手架工程；5.跨度36m及以上的钢结构安装工程。',
    tags: ['超危大', '专家论证', '高大模板'],
    source: '危大工程',
    isBuiltIn: true,
  },
  {
    title: '专项施工方案编制内容',
    category: 'pce',
    content: '专项施工方案应当包括以下内容：1.工程概况：危大工程概况和特点、施工平面布置、施工要求和技术保证条件；2.编制依据：相关法律、法规、规范性文件、标准、规范及施工图设计文件、施工组织设计等；3.施工计划：包括施工进度计划、材料与设备计划；4.施工工艺技术：技术参数、工艺流程、施工方法、操作要求、检查要求等；5.施工安全保证措施：组织保障措施、技术措施、监测监控措施等；6.施工管理及作业人员配备和分工：施工管理人员、专职安全生产管理人员、特种作业人员等；7.验收要求：验收标准、验收程序、验收内容、验收人员等；8.应急处置措施；9.计算书及相关施工图纸。',
    tags: ['专项方案', '编制内容', '安全措施'],
    source: '危大工程',
    isBuiltIn: true,
  },
  {
    title: '高处作业安全要求',
    category: 'measure',
    content: '高处作业安全要求：1.进入施工现场必须佩戴安全帽，高处作业人员必须系好安全带，安全带应高挂低用；2.临边作业必须设置防护栏杆、挡脚板，并挂安全立网封闭；3.洞口作业必须设置牢固的盖板、防护栏杆、安全网或其他防坠落的防护设施；4.攀登作业必须使用梯子或其他攀登设施，梯脚底部应坚实不得垫高使用；5.悬空作业必须有牢靠的立足点，并应配置安全网、栏杆等防护设施；6.遇有六级以上强风、浓雾、暴雨、大雪等恶劣天气，不得进行露天攀登与悬空高处作业。',
    tags: ['高处作业', '临边防护', '安全带'],
    source: '安全措施',
    isBuiltIn: true,
  },
  {
    title: '临时用电安全技术规范要点',
    category: 'standard',
    content: '施工现场临时用电必须遵循JGJ46-2005规范：1.采用三级配电系统（总配电箱-分配电箱-开关箱）；2.采用TN-S接零保护系统（三相五线制）；3.采用二级漏电保护系统（总配电箱和开关箱均设漏电保护器）；4.实行"一机、一闸、一漏、一箱"制度，严禁同一个开关电器直接控制两台及两台以上用电设备；5.配电箱、开关箱周围应有足够2人同时工作的空间和通道，不得堆放任何妨碍操作、维修的物品；6.漏电保护器参数：开关箱内漏电保护器额定漏电动作电流不应大于30mA，额定漏电动作时间不应大于0.1s。',
    tags: ['临时用电', '三级配电', 'TN-S', '漏电保护'],
    source: '标准规范',
    isBuiltIn: true,
  },
  {
    title: '脚手架搭设安全要点',
    category: 'measure',
    content: '扣件式钢管脚手架搭设安全要点：1.脚手架立杆基础应平整夯实，底座或垫板应准确放在定位线上；2.必须设置纵、横向扫地杆，纵向扫地杆应采用直角扣件固定在距钢管底端不大于200mm处的立杆上；3.立杆接长除顶层顶步可采用搭接外，其余各层各步接头必须采用对接扣件连接；4.连墙件必须采用可承受拉力和压力的构造，对高度24m以上的双排脚手架，必须采用刚性连墙件与建筑物可靠连接；5.剪刀撑应随立杆、纵向和横向水平杆等同步搭设，各底层斜杆下端均必须支承在垫块或垫板上；6.脚手架搭设完毕必须经验收合格后方可使用。',
    tags: ['脚手架', '扫地杆', '连墙件', '剪刀撑'],
    source: '安全措施',
    isBuiltIn: true,
  },
  {
    title: '深基坑作业安全措施',
    category: 'measure',
    content: '深基坑作业安全措施：1.深基坑工程必须编制专项施工方案，开挖深度超过5m（含5m）的必须组织专家论证；2.基坑周边必须设置防护栏杆，栏杆高度不应低于1.2m，栏杆柱间距不应大于2m；3.基坑周边严禁超堆荷载，坑边堆置土方和材料、沿挖方边缘移动运输工具和机械，应与挖方边缘保持一定距离；4.基坑开挖应严格按要求放坡，操作时应随时注意土壁的变动情况，如发现有裂纹或部分坍塌现象，应及时进行支撑或放坡；5.应设置有效的排水措施，坑内积水应及时排除；6.深基坑施工应进行第三方监测，监测数据超过预警值时必须立即停止施工，疏散人员。',
    tags: ['深基坑', '专家论证', '监测', '防护栏杆'],
    source: '安全措施',
    isBuiltIn: true,
  },
  {
    title: '安全检查标准要点',
    category: 'standard',
    content: 'JGJ59-2011建筑施工安全检查标准：1.安全检查评分汇总表满分100分，分为优良（80分及以上）、合格（70分及以上）、不合格（70分以下）三个等级；2.检查内容包括：安全管理、文明施工、脚手架、基坑工程、模板支架、高处作业、施工用电、物料提升机与施工升降机、塔式起重机与起重吊装、施工机具共10项；3.保证项目均应达到合格标准，任一保证项目不合格，则该检查评分表为不合格；4.当起重吊装或施工机具检查评分表未得分，且汇总表得分值在80分以下时为不合格。',
    tags: ['安全检查', 'JGJ59', '评分标准', '保证项目'],
    source: '标准规范',
    isBuiltIn: true,
  },
]

export interface RetrievalResult {
  item: KnowledgeItem
  score: number
  highlights: string[]
}

class KnowledgeRetrievalService {
  private async ensureBuiltInKnowledge(): Promise<void> {
    const count = await db.knowledgeItems.where('isBuiltIn').equals(1 as any).count()
    if (count === 0) {
      for (const item of BUILT_IN_KNOWLEDGE) {
        await db.knowledgeItems.put({
          ...item,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        })
      }
    }
  }

  async addKnowledge(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeItem> {
    const newItem: KnowledgeItem = {
      ...item,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    }
    await db.knowledgeItems.put(newItem)
    return newItem
  }

  async listKnowledge(category?: string): Promise<KnowledgeItem[]> {
    await this.ensureBuiltInKnowledge()
    if (category) {
      return db.knowledgeItems.where('category').equals(category).toArray()
    }
    return db.knowledgeItems.toArray()
  }

  async deleteKnowledge(id: string): Promise<void> {
    const item = await db.knowledgeItems.get(id)
    if (item?.isBuiltIn) {
      throw new Error('内置知识库条目不能删除')
    }
    await db.knowledgeItems.delete(id)
  }

  private tokenize(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
    const words: string[] = []
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i]
      if (/[\u4e00-\u9fa5]/.test(char)) {
        words.push(char)
        if (i < cleaned.length - 1 && /[\u4e00-\u9fa5]/.test(cleaned[i + 1])) {
          words.push(cleaned.slice(i, i + 2))
        }
      } else if (/[a-z0-9]/.test(char)) {
        let j = i
        let word = ''
        while (j < cleaned.length && /[a-z0-9]/.test(cleaned[j])) {
          word += cleaned[j]
          j++
        }
        words.push(word)
        i = j - 1
      }
    }
    return words.filter(w => w.length > 0)
  }

  async retrieve(query: string, topK: number = 5): Promise<RetrievalResult[]> {
    await this.ensureBuiltInKnowledge()
    const allItems = await db.knowledgeItems.toArray()
    const queryTokens = this.tokenize(query)

    if (queryTokens.length === 0) return []

    const results: RetrievalResult[] = []

    for (const item of allItems) {
      const titleTokens = this.tokenize(item.title)
      const contentTokens = this.tokenize(item.content)
      const tagTokens = item.tags ? this.tokenize(item.tags.join(' ')) : []

      let score = 0
      const titleMatches = new Set<string>()
      const contentMatches = new Set<string>()

      for (const qt of queryTokens) {
        if (titleTokens.includes(qt)) {
          score += 3
          titleMatches.add(qt)
        }
        if (tagTokens.includes(qt)) {
          score += 2
        }
        if (contentTokens.includes(qt)) {
          score += 1
          contentMatches.add(qt)
        }
        if (item.title.toLowerCase().includes(qt)) {
          score += 2
        }
        if (item.content.toLowerCase().includes(qt)) {
          score += 0.5
        }
      }

      if (score > 0) {
        const sentences = item.content.split(/[。；！？\n]/).filter(s => s.trim().length > 5)
        const highlights: string[] = []
        for (const sentence of sentences) {
          for (const qt of queryTokens) {
            if (sentence.includes(qt) && !highlights.includes(sentence.trim())) {
              highlights.push(sentence.trim())
              break
            }
          }
          if (highlights.length >= 2) break
        }
        results.push({ item, score, highlights })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  async retrieveWithContext(query: string, topK: number = 3): Promise<string> {
    const results = await this.retrieve(query, topK)
    if (results.length === 0) return ''

    const contextParts = results.map((r, idx) => {
      return `[参考资料${idx + 1}]《${r.item.title}》\n${r.item.content}`
    })

    return contextParts.join('\n\n')
  }

  async generateWithRAG(
    prompt: string,
    extraContext?: string,
    stream = false,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const { aiService } = await import('./ai.service')

    const context = await this.retrieveWithContext(prompt)

    const systemPrompt = `你是一位专业的建筑施工安全管理专家，擅长编写安全专项方案、安全技术交底、安全管理制度等文档。

请严格基于以下参考资料回答问题，如果参考资料中没有相关内容，请根据你的专业知识回答，但要在结尾注明"[部分内容为专业补充]"。

回答要求：
1. 语言严谨、专业，符合工程文档规范
2. 结构清晰，分点论述
3. 内容具体、可操作，避免空洞的表述
4. 引用参考资料时，在相关段落末尾标注[参考资料X]

参考资料：
${context || '（暂无相关参考资料，请基于专业知识回答）'}

${extraContext ? `\n额外上下文信息：\n${extraContext}\n` : ''}`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: prompt },
    ]

    return aiService.chat(messages, stream, onChunk)
  }
}

export const knowledgeRetrievalService = new KnowledgeRetrievalService()
