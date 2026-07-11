import ExcelJS from 'exceljs'

export interface LedgerExportOptions {
  /** 模板文件名（相对于 public/templates/ledgers/ 路径） */
  templateFile: string
  /** 二维数据行数组，每行是与表格列对应的原始值 */
  dataRows: (string | number | Date | null | undefined)[][]
  /** 模板行所在行号（1-based），该行的样式/边框/格式将作为新行的克隆源 */
  startRow: number
  /** 可选：模板行是否保留（默认 false，即数据替换模板行） */
  keepTemplateRow?: boolean
  /** 可选：要写入文件头的附加元信息（如 { A1: '项目名称', B2: 'xxx' }） */
  headerReplacements?: Record<string, string | number | Date>
  /** 可选：要追加的页脚行（在数据后追加签名/备注区域的占位文本） */
  footerRows?: (string | number | null)[][]
  /** 是否注入防篡改页脚（默认 true） */
  addWatermark?: boolean
}

export class LedgerExportService {
  /**
   * 深拷贝单元格样式对象（ExcelJS 的 style 对象是 plain object，可 JSON 序列化克隆）
   */
  private static cloneStyle(style: Partial<ExcelJS.Style>): Partial<ExcelJS.Style> {
    if (!style) return {}
    return JSON.parse(JSON.stringify(style))
  }

  /**
   * 核心方法：基于 Excel 模板动态插行 + 样式克隆 + 实时数据填充，返回 Blob
   *
   * 设计原则（SSOT 闭环）：
   * - 不缓存，不预生成，每次调用实时从 IndexedDB 读数据 → fetch 模板 → 渲染 → 导出
   * - 新插入的每一行 100% 继承模板行的字体、边框、填充、对齐、数字格式、数据验证
   * - 自动在末尾注入"防篡改页脚"，标注生成时间与记录数
   */
  static async generateExcelLedger(options: LedgerExportOptions): Promise<Blob> {
    const {
      templateFile,
      dataRows,
      startRow,
      keepTemplateRow = false,
      headerReplacements,
      footerRows,
      addWatermark = true,
    } = options

    // 1. 从 public 目录 fetch 模板 → ArrayBuffer
    const templateUrl = new URL(
      `../../templates/ledgers/${templateFile}`,
      import.meta.url,
    ).href
    const resp = await fetch(templateUrl)
    if (!resp.ok) {
      throw new Error(`模板文件加载失败: ${templateFile} (HTTP ${resp.status})`)
    }
    const templateBuffer = await resp.arrayBuffer()

    // 2. 加载到 ExcelJS Workbook
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(templateBuffer)
    const ws = wb.worksheets[0]
    if (!ws) throw new Error('Excel 模板中没有工作表')

    // 3. 计算模板行列数
    const actualColCount = ws.columnCount
    // 取模板行作为样式源
    const templateRowRef = ws.getRow(startRow)
    const templateRowHeight = templateRowRef.height
    // 保存模板行每一列的样式/校验规则快照（防止后续插行导致引用偏移）
    const templateStyles: Array<{
      style: Partial<ExcelJS.Style>
      numFmt?: string
      dataValidation?: unknown
    }> = []
    for (let c = 1; c <= actualColCount; c++) {
      const cell = templateRowRef.getCell(c)
      templateStyles.push({
        style: LedgerExportService.cloneStyle(cell.style as Partial<ExcelJS.Style>),
        numFmt: cell.numFmt,
        dataValidation: (cell as unknown as { dataValidation?: unknown }).dataValidation
          ? JSON.parse(JSON.stringify((cell as unknown as { dataValidation?: unknown }).dataValidation))
          : undefined,
      })
    }

    // 4. 写入文件头元信息（项目名、日期等非表格区域）
    if (headerReplacements) {
      for (const [addr, value] of Object.entries(headerReplacements)) {
        const cell = ws.getCell(addr)
        cell.value = value instanceof Date ? value : value
      }
    }

    // 5. 动态插行 + 样式克隆
    // 策略：先在 startRow 位置插入 dataRows.length 个空行，再逐行填充值并克隆样式
    const n = dataRows.length
    if (n > 0) {
      // spliceRows(rowIndex, count, ...newValues) — 在 rowIndex 处插入 count 行
      // 原 startRow 及之后行会向下移动
      ws.spliceRows(startRow, 0, ...Array(n).fill(null).map(() => []))

      for (let i = 0; i < n; i++) {
        const currentRowNum = startRow + i
        const row = ws.getRow(currentRowNum)
        const rowData = dataRows[i]

        // 行高
        if (templateRowHeight) row.height = templateRowHeight

        // 填值 + 克隆样式
        for (let c = 1; c <= actualColCount; c++) {
          const cell = row.getCell(c)
          const tmpl = templateStyles[c - 1]
          const raw = rowData[c - 1]

          // 设置值（ExcelJS 自动识别 Date/number/string）
          if (raw !== undefined && raw !== null) {
            cell.value = raw
          }

          // 应用样式
          if (tmpl) {
            if (tmpl.style) cell.style = tmpl.style as ExcelJS.Style
            if (tmpl.numFmt) cell.numFmt = tmpl.numFmt
            if (tmpl.dataValidation) {
              ;(cell as unknown as { dataValidation?: unknown }).dataValidation = tmpl.dataValidation
            }
          }
        }
        row.commit()
      }

      // 处理原始模板行：
      // 若不保留模板行，且模板行原本为空（是占位行），删除它
      // 插入 n 行后，模板行现在位于 startRow + n
      if (!keepTemplateRow) {
        // 检查模板行是否为空行（原始行通常留空作为"格式参考行"）
        const shiftedTemplateRow = ws.getRow(startRow + n)
        let isEmpty = true
        for (let c = 1; c <= actualColCount; c++) {
          const v = shiftedTemplateRow.getCell(c).value
          if (v !== null && v !== undefined && v !== '') {
            isEmpty = false
            break
          }
        }
        if (isEmpty) {
          ws.spliceRows(startRow + n, 1)
        }
      }
    }

    // 6. 计算数据区域结束位置（用于追加 footer）
    let cursor = startRow + (keepTemplateRow ? n : n - 1) + 1
    if (n === 0) cursor = startRow
    if (cursor < startRow + 1) cursor = startRow + 1

    // 7. 追加自定义页脚行（签名、备注等）
    if (footerRows && footerRows.length > 0) {
      cursor += 1 // 空一行
      for (const rowData of footerRows) {
        const row = ws.getRow(cursor)
        for (let c = 1; c <= rowData.length; c++) {
          const v = rowData[c - 1]
          if (v !== null && v !== undefined) {
            row.getCell(c).value = v
          }
        }
        cursor++
      }
    }

    // 8. 防篡改页脚
    if (addWatermark) {
      cursor += 1
      const now = new Date()
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const watermarkCell = ws.getCell(cursor, 1)
      watermarkCell.value = `此台账由溜哥的安全管理平台于 ${timeStr} 自动生成，共 ${n} 条记录，数据来源为系统实时数据库，篡改无效。`
      watermarkCell.font = { name: '宋体', size: 9, italic: true, color: { argb: 'FF999999' } }
      watermarkCell.alignment = { horizontal: 'left', vertical: 'middle' }
      // 合并水印行覆盖整个数据宽度
      if (actualColCount > 1) {
        ws.mergeCells(cursor, 1, cursor, Math.min(actualColCount, 10))
      }
    }

    // 9. 输出为 Blob
    const buffer = await wb.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /**
   * 便捷方法：生成并触发浏览器下载
   */
  static async downloadExcelLedger(options: LedgerExportOptions & { fileName: string }): Promise<void> {
    const blob = await LedgerExportService.generateExcelLedger(options)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = options.fileName.endsWith('.xlsx') ? options.fileName : `${options.fileName}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
