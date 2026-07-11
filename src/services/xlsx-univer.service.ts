import ExcelJS from 'exceljs'
import type { IWorkbookData, IWorksheetData, ICellData, IStyleData, IRange, IBorderStyleData } from '@univerjs/core'
import { BooleanNumber, HorizontalAlign, LocaleType, VerticalAlign } from '@univerjs/core'

const DEFAULT_ROW_COUNT = 100
const DEFAULT_COL_COUNT = 30
const DEFAULT_ROW_HEIGHT = 19
const DEFAULT_COL_WIDTH = 88

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function rgbToHex(rgb?: { r: number; g: number; b: number; a?: number } | string): string | undefined {
  if (!rgb) return undefined
  if (typeof rgb === 'string') {
    if (rgb.startsWith('#')) return rgb
    if (rgb.startsWith('rgb')) {
      const parts = rgb.match(/\d+/g)
      if (!parts || parts.length < 3) return undefined
      const [r, g, b] = parts.map(Number)
      return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
    }
    return undefined
  }
  const { r, g, b } = rgb
  if (r === undefined || g === undefined || b === undefined) return undefined
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function argbToHex(argb?: string): string | undefined {
  if (!argb || typeof argb !== 'string') return undefined
  const hex = argb.replace('#', '')
  if (hex.length === 8) return `#${hex.slice(2)}`
  if (hex.length === 6) return `#${hex}`
  return undefined
}

function alignFromExcel(align?: string): HorizontalAlign | undefined {
  switch (align) {
    case 'left': return HorizontalAlign.LEFT
    case 'center': return HorizontalAlign.CENTER
    case 'right': return HorizontalAlign.RIGHT
    default: return undefined
  }
}

function verticalFromExcel(align?: string): VerticalAlign | undefined {
  switch (align) {
    case 'top': return VerticalAlign.TOP
    case 'middle': return VerticalAlign.MIDDLE
    case 'bottom': return VerticalAlign.BOTTOM
    default: return undefined
  }
}

function borderFromExcel(border?: ExcelJS.Border): IBorderStyleData | undefined {
  if (!border || border.style === undefined || border.style === null) return undefined
  const color = rgbToHex(border.color as unknown as { r: number; g: number; b: number }) ?? argbToHex((border.color as unknown as { argb: string })?.argb) ?? '#000000'
  const styleMap: Record<string, number> = {
    thin: 1, hair: 1, medium: 2, thick: 3, double: 4,
    dashed: 5, dotted: 6, mediumDashed: 7, dashDot: 8, mediumDashDot: 9,
    dashDotDot: 10, mediumDashDotDot: 11, slantDashDot: 12,
  }
  const s = styleMap[border.style] ?? 1
  return { s, cl: { rgb: color } } as IBorderStyleData
}

function parseCellAddress(address: string): { row: number; col: number } | null {
  const match = address.match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  const colLetters = match[1]
  let col = 0
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64)
  }
  return { row: Number(match[2]) - 1, col: col - 1 }
}

function cellStyleFromExcel(cell: ExcelJS.Cell): IStyleData {
  const style: IStyleData = {}
  const font = cell.font
  if (font) {
    if (font.bold) style.bl = BooleanNumber.TRUE
    if (font.italic) style.it = BooleanNumber.TRUE
    if (font.size) style.fs = font.size
    const color = rgbToHex(font.color as unknown as { r: number; g: number; b: number }) ?? argbToHex((font.color as unknown as { argb: string })?.argb)
    if (color) style.cl = { rgb: color }
  }
  const fill = cell.fill
  if (fill && fill.type === 'pattern' && fill.pattern === 'solid') {
    const color = rgbToHex(fill.fgColor as unknown as { r: number; g: number; b: number }) ?? argbToHex((fill.fgColor as unknown as { argb: string })?.argb)
    if (color) style.bg = { rgb: color }
  }
  const align = alignFromExcel(cell.alignment?.horizontal)
  if (align !== undefined) style.ht = align
  const vt = verticalFromExcel(cell.alignment?.vertical)
  if (vt !== undefined) style.vt = vt
  const borders = cell.border
  if (borders) {
    const bd: Record<string, unknown> = {}
    if (borders.left) bd.l = borderFromExcel(borders.left as ExcelJS.Border)
    if (borders.right) bd.r = borderFromExcel(borders.right as ExcelJS.Border)
    if (borders.top) bd.t = borderFromExcel(borders.top as ExcelJS.Border)
    if (borders.bottom) bd.b = borderFromExcel(borders.bottom as ExcelJS.Border)
    style.bd = bd as IStyleData['bd']
  }
  return style
}

function cellValueToUniver(cell: ExcelJS.Cell): ICellData {
  const data: ICellData = {}
  const raw = cell.value
  if (raw === null || raw === undefined) return data

  if (typeof raw === 'number') {
    data.v = raw
    data.t = 2
  } else if (typeof raw === 'boolean') {
    data.v = raw
    data.t = 4
  } else if (raw instanceof Date) {
    data.v = raw.getTime()
    data.t = 3
  } else if (typeof raw === 'object' && 'formula' in raw && raw.formula) {
    data.f = raw.formula as string
    data.v = (raw.result ?? '') as string | number | boolean
  } else if (typeof raw === 'object' && 'richText' in raw && Array.isArray(raw.richText)) {
    data.v = raw.richText.map((t) => t?.text ?? '').join('')
    data.t = 1
  } else if (typeof raw === 'object') {
    data.v = raw.toString ? raw.toString() : String(raw)
    data.t = 1
  } else {
    data.v = String(raw)
    data.t = 1
  }
  return data
}

export async function xlsxBufferToUniverWorkbookData(buffer: ArrayBuffer): Promise<Partial<IWorkbookData>> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const styles: Record<string, IStyleData> = {}
  const sheets: Record<string, Partial<IWorksheetData>> = {}
  const sheetOrder: string[] = []

  workbook.eachSheet((worksheet, index) => {
    const sheetId = `sheet-${index}-${generateId().slice(0, 8)}`
    sheetOrder.push(sheetId)

    const maxRow = worksheet.rowCount || 1
    const maxCol = worksheet.columnCount || 1
    const rowCount = Math.max(maxRow + 5, DEFAULT_ROW_COUNT)
    const columnCount = Math.max(maxCol + 3, DEFAULT_COL_COUNT)

    const cellData: Record<number, Record<number, ICellData>> = {}
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const rowCells: Record<number, ICellData> = {}
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const data = cellValueToUniver(cell)
        const style = cellStyleFromExcel(cell)
        if (Object.keys(style).length > 0) {
          const styleKey = JSON.stringify(style)
          let styleId = Object.entries(styles).find(([, v]) => JSON.stringify(v) === styleKey)?.[0]
          if (!styleId) {
            styleId = `s${Object.keys(styles).length + 1}`
            styles[styleId] = style
          }
          data.s = styleId
        }
        rowCells[colNumber - 1] = data
      })
      if (Object.keys(rowCells).length > 0) {
        cellData[rowNumber - 1] = rowCells
      }
    })

    const mergeData: IRange[] = []
    worksheet.model.merges?.forEach((merge) => {
      const [tl, br] = merge.split(':')
      if (!tl || !br) return
      const start = parseCellAddress(tl)
      const end = parseCellAddress(br)
      if (!start || !end) return
      mergeData.push({
        startRow: start.row,
        startColumn: start.col,
        endRow: end.row,
        endColumn: end.col,
      })
    })

    const columnData: Record<number, { w: number }> = {}
    worksheet.columns.forEach((col, idx) => {
      if (col && typeof col.width === 'number' && col.width > 0) {
        columnData[idx] = { w: Math.max(col.width * 8, DEFAULT_COL_WIDTH) }
      }
    })

    const rowData: Record<number, { h: number }> = {}
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (row.height) {
        rowData[rowNumber - 1] = { h: row.height }
      }
    })

    const sheetData: Partial<IWorksheetData> = {
      id: sheetId,
      name: worksheet.name,
      rowCount,
      columnCount,
      cellData,
      mergeData,
      columnData,
      rowData,
      defaultRowHeight: DEFAULT_ROW_HEIGHT,
      defaultColumnWidth: DEFAULT_COL_WIDTH,
      hidden: worksheet.state === 'hidden' ? BooleanNumber.TRUE : BooleanNumber.FALSE,
      showGridlines: BooleanNumber.TRUE,
      rightToLeft: BooleanNumber.FALSE,
      freeze: { xSplit: 0, ySplit: 0, startRow: 0, startColumn: 0 },
      tabColor: '',
      zoomRatio: 1,
      scrollTop: 0,
      scrollLeft: 0,
      rowHeader: { width: 46, hidden: BooleanNumber.FALSE },
      columnHeader: { height: 20, hidden: BooleanNumber.FALSE },
    }

    sheets[sheetId] = sheetData
  })

  return {
    id: `workbook-${generateId()}`,
    name: '工作簿1',
    appVersion: '3.0.0',
    locale: LocaleType.ZH_CN,
    styles,
    sheetOrder,
    sheets,
  }
}

function borderToExcel(b?: IBorderStyleData): ExcelJS.Border | undefined {
  if (!b) return undefined
  const styleNames: Record<number, ExcelJS.BorderStyle> = {
    1: 'thin', 2: 'medium', 3: 'thick', 4: 'double',
    5: 'dashed', 6: 'dotted', 7: 'mediumDashed', 8: 'dashDot',
    9: 'mediumDashDot', 10: 'dashDotDot', 11: 'mediumDashDotDot', 12: 'slantDashDot',
  }
  const rgb = b.cl?.rgb
  return {
    style: styleNames[(b.s as number) ?? 1] || 'thin',
    color: typeof rgb === 'string' ? { argb: rgb.replace('#', '') } : undefined,
  } as ExcelJS.Border
}

export async function univerWorkbookDataToXlsxBuffer(data: IWorkbookData): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const styleMap = data.styles || {}

  data.sheetOrder.forEach((sheetId) => {
    const sheet = data.sheets[sheetId]
    if (!sheet) return
    const worksheet = workbook.addWorksheet(sheet.name || 'Sheet')

    if (sheet.columnData) {
      Object.entries(sheet.columnData).forEach(([colIdx, col]) => {
        const colNumber = Number(colIdx) + 1
        if (col && col.w) {
          worksheet.getColumn(colNumber).width = col.w / 8
        }
      })
    }

    if (sheet.rowData) {
      Object.entries(sheet.rowData).forEach(([rowIdx, row]) => {
        const rowNumber = Number(rowIdx) + 1
        if (row && row.h) {
          worksheet.getRow(rowNumber).height = row.h
        }
      })
    }

    if (sheet.cellData) {
      Object.entries(sheet.cellData).forEach(([rowIdx, rowCells]) => {
        const rowNumber = Number(rowIdx) + 1
        Object.entries(rowCells as Record<string, ICellData>).forEach(([colIdx, cellData]) => {
          const colNumber = Number(colIdx) + 1
          const cell = worksheet.getCell(rowNumber, colNumber)
          if (cellData.f) {
            cell.value = { formula: cellData.f, result: cellData.v } as ExcelJS.CellValue
          } else if (cellData.v !== undefined && cellData.v !== null) {
            cell.value = cellData.v as ExcelJS.CellValue
          }

          const styleId = cellData.s
          if (styleId && typeof styleId === 'string' && styleMap[styleId]) {
            const style = styleMap[styleId]
            const font: Partial<ExcelJS.Font> = {}
            if (style.bl) font.bold = true
            if (style.it) font.italic = true
            if (style.fs) font.size = style.fs
            if (style.cl?.rgb) font.color = { argb: style.cl.rgb.replace('#', '') }
            if (Object.keys(font).length > 0) cell.font = font as ExcelJS.Font

            if (style.bg?.rgb) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: style.bg.rgb.replace('#', '') },
              } as ExcelJS.FillPattern
            }

            if (style.ht !== undefined || style.vt !== undefined) {
              cell.alignment = {
                horizontal: style.ht === HorizontalAlign.LEFT ? 'left' : style.ht === HorizontalAlign.CENTER ? 'center' : style.ht === HorizontalAlign.RIGHT ? 'right' : undefined,
                vertical: style.vt === VerticalAlign.TOP ? 'top' : style.vt === VerticalAlign.MIDDLE ? 'middle' : style.vt === VerticalAlign.BOTTOM ? 'bottom' : undefined,
              }
            }

            if (style.bd) {
              const border: Partial<ExcelJS.Borders> = {}
              if (style.bd.l) border.left = borderToExcel(style.bd.l)
              if (style.bd.r) border.right = borderToExcel(style.bd.r)
              if (style.bd.t) border.top = borderToExcel(style.bd.t)
              if (style.bd.b) border.bottom = borderToExcel(style.bd.b)
              if (Object.keys(border).length > 0) cell.border = border as ExcelJS.Borders
            }
          }
        })
      })
    }

    if (sheet.mergeData) {
      sheet.mergeData.forEach((range) => {
        try {
          worksheet.mergeCells(range.startRow + 1, range.startColumn + 1, range.endRow + 1, range.endColumn + 1)
        } catch {
          // ignore invalid merges
        }
      })
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}
