export const APP_NAME = '溜哥的安全管理平台'
export const APP_VERSION = '2.0.0'
export const APP_SHORT_NAME = '安全平台'
export const PRIMARY_COLOR = '#0F766E'
export const PRIMARY_COLOR_LIGHT = '#14B8A6'

export const SIDEBAR_WIDTH = 240
export const SIDEBAR_COLLAPSED_WIDTH = 64
export const HEADER_HEIGHT = 56

export const DEFAULT_PROJECT_NAME = '大理机场土石方项目二标段'

/** 下载 Blob 文件到本地 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
