// 旧版自研分词逻辑备份（v4.x 双字滑窗 + 安全领域词匹配）
// 仅供追溯，不要再被业务代码引用

const STOP_WORDS = new Set([
  '的', '了', '和', '在', '是', '为', '以', '及', '或', '等', '与', '对', '从',
  '被', '把', '给', '让', '向', '到', '由', '于', '之', '其', '此', '该', '应',
  '须', '需', '可', '能', '要', '不', '有', '无', '未', '已', '将', '所', '如',
  '若', '则', '但', '并', '且', '而', '又', '也', '都', '就', '还', '即', '当',
  '上', '下', '中', '内', '外', '前', '后', '间', '内', '各', '每', '个', '种',
  '类', '项', '条', '款', '本', '一', '二', '三', '四', '五', '六', '七', '八',
  '九', '十', '个', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'or', 'not', 'by',
])

const SAFETY_DOMAIN_TERMS = [
  '安全生产', '安全管理', '专项方案', '施工方案', '危大工程', '深基坑', '高支模',
  '脚手架', '扣件式', '满堂架', '剪刀撑', '扫地杆', '连墙件', '临边防护',
  '洞口防护', '高处作业', '安全带', '安全帽', '安全网', '三级配电', '二级保护',
  'TN-S', '漏电保护', '一机一闸', '临时用电', '接地保护', '接零保护', '动火作业',
  '有限空间', '受限空间', '应急预案', '应急演练', '三级教育', '安全交底',
  '技术交底', '特种作业', '持证上岗', '隐患排查', '隐患整改', '安全检查',
  '文明施工', '环境保护', '消防安全', '动火证', '施工电梯', '塔式起重机',
  '塔吊', '物料提升机', '施工升降机', '附着式升降脚手架', '高大模板',
  '专家论证', '旁站监督', '安全验收', '防护栏杆', '挡脚板', '密目网',
  '五临边', '三宝四口', '双控体系', '风险分级', '风险辨识', '安全费用',
  '安全措施费', '安全总监', '安全员', '项目经理', '技术负责人', '总监',
  '建设单位', '监理单位', '施工单位', '总承包', '分包单位', 'JGJ', 'GB',
  'JGJ59', 'JGJ46', 'JGJ80', 'JGJ130', 'JGJ162', 'JGJ180', '建质',
]

export function legacyBm25Tokenize(text: string): string[] {
  if (!text) return []
  const tokens: string[] = []
  const seen = new Set<string>()
  const lower = text.toLowerCase()

  for (const term of SAFETY_DOMAIN_TERMS) {
    const t = term.toLowerCase()
    if (lower.includes(t)) {
      if (!seen.has(t)) {
        tokens.push(t)
        seen.add(t)
      }
    }
  }

  const cleaned = lower.replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')

  let numBuf = ''
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (/[a-z0-9]/.test(ch)) {
      numBuf += ch
    } else {
      if (numBuf.length >= 2) {
        if (!seen.has(numBuf) && !STOP_WORDS.has(numBuf)) {
          tokens.push(numBuf)
          seen.add(numBuf)
        }
      }
      numBuf = ''
    }
  }
  if (numBuf.length >= 2 && !seen.has(numBuf) && !STOP_WORDS.has(numBuf)) {
    tokens.push(numBuf)
  }

  const chineseChars = cleaned.replace(/[^\\u4e00-\\u9fa5]/g, '')
  for (let i = 0; i < chineseChars.length; i++) {
    if (i < chineseChars.length - 1) {
      const bigram = chineseChars.slice(i, i + 2)
      if (!STOP_WORDS.has(bigram[0]) && !STOP_WORDS.has(bigram[1])) {
        if (!seen.has(bigram)) {
          tokens.push(bigram)
          seen.add(bigram)
        }
      }
    }
    const single = chineseChars[i]
    if (!STOP_WORDS.has(single) && single.length > 0) {
      if (!seen.has(single)) {
        tokens.push(single)
        seen.add(single)
      }
    }
  }

  return tokens
}

export function legacyKnowledgeRetrievalTokenize(text: string): string[] {
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
  return words.filter((w) => w.length > 0)
}
