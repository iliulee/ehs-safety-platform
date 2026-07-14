// @ts-ignore - Vite 资源导入，无对应类型声明
import wasmUrl from '../../node_modules/jieba-wasm/pkg/web/jieba_rs_wasm_bg.wasm?url'

type CutFn = (text: string, hmm?: boolean | null) => string[]

let nodeJieba: any = null
let wasmCut: CutFn | null = null
let initPromise: Promise<void> | null = null
let initError: Error | null = null

async function doInit(): Promise<void> {
  try {
    // 使用变量避免 esbuild 在 dev 模式下静态解析 @node-rs/jieba 的 browser 入口
    const modName = '@node-rs/jieba'
    const jiebaMod = await import(/* @vite-ignore */ modName) as any
    const dictModName = '@node-rs/jieba/dict'
    const { dict } = await import(/* @vite-ignore */ dictModName) as { dict: Uint8Array }
    nodeJieba = jiebaMod.Jieba.withDict(dict)
    return
  } catch {
    // 浏览器 / Electron 渲染进程无原生绑定，继续 fallback
  }

  try {
    // jieba-wasm 未安装，使用兜底分词
    throw new Error('jieba-wasm not installed, using fallback')
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err))
    console.warn('分词器初始化失败，将使用兜底分词规则：', initError.message)
  }
}

export function ensureTokenizer(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = doInit()
  return initPromise
}

function normalizeTokens(tokens: string[]): string[] {
  return tokens
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function simpleFallback(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
  return cleaned.split(/\s+/).filter((t) => t.length > 0)
}

export function tokenize(text: string): string[] {
  if (!text) return []

  if (nodeJieba) {
    return normalizeTokens(nodeJieba.cut(text, false))
  }

  if (wasmCut) {
    return normalizeTokens(wasmCut(text, false))
  }

  return simpleFallback(text)
}

void ensureTokenizer()