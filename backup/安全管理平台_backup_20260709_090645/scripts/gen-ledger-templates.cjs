const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')

const outDir = path.resolve(__dirname, '..', 'public', 'templates', 'ledgers')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
}

const titleFont = { name: '宋体', size: 16, bold: true }
const headerFont = { name: '宋体', size: 11, bold: true }
const bodyFont = { name: '宋体', size: 10 }
const centerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true }
const leftAlign = { horizontal: 'left', vertical: 'middle', wrapText: true }
const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }

async function createEducationRoster() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('三级教育花名册')

  // 列宽
  ws.columns = [
    { width: 6 },   // 序号
    { width: 12 },  // 姓名
    { width: 8 },   // 性别
    { width: 20 },  // 身份证号
    { width: 12 },  // 工种
    { width: 22 },  // 分包单位
    { width: 12 },  // 进场日期
    { width: 14 },  // 公司级教育
    { width: 14 },  // 项目级教育
    { width: 14 },  // 班组级教育
    { width: 16 },  // 教育人
    { width: 16 },  // 受教育人签字
    { width: 14 },  // 备注
  ]

  // 第1行：标题
  ws.mergeCells('A1:M1')
  const title = ws.getCell('A1')
  title.value = '三级安全教育花名册'
  title.font = titleFont
  title.alignment = centerAlign
  ws.getRow(1).height = 32

  // 第2行：工程名称 / 日期
  ws.mergeCells('A2:C2')
  ws.getCell('A2').value = '工程名称：'
  ws.getCell('D2').value = '{PROJECT_NAME}'
  ws.mergeCells('D2:H2')
  ws.getCell('I2').value = '日期：'
  ws.getCell('J2').value = '{DATE}'
  ws.mergeCells('J2:M2')
  ws.getRow(2).height = 22
  ;['A2','D2','I2','J2'].forEach(addr => {
    ws.getCell(addr).font = { name: '宋体', size: 10 }
    ws.getCell(addr).alignment = leftAlign
  })

  // 第3行：合并表头行 - "三级安全教育内容及时间"
  ws.mergeCells('A3:M3')
  ws.getCell('A3').value = '注：新进场工人必须进行公司、项目、班组三级安全教育，考试合格后方可上岗作业。'
  ws.getCell('A3').font = { name: '宋体', size: 9, italic: true, color: { argb: 'FF666666' } }
  ws.getCell('A3').alignment = leftAlign
  ws.getRow(3).height = 18

  // 第4行：主表头
  const headers = ['序号', '姓名', '性别', '身份证号', '工种', '分包单位', '进场日期', '公司级', '项目级', '班组级', '教育人', '签字', '备注']
  headers.forEach((h, i) => {
    const cell = ws.getRow(4).getCell(i + 1)
    cell.value = h
    cell.font = headerFont
    cell.alignment = centerAlign
    cell.fill = headerFill
    cell.border = thinBorder
  })
  ws.getRow(4).height = 28

  // 第5行：模板数据行（空行，样式将被克隆）
  const templateRowNum = 5
  for (let c = 1; c <= 13; c++) {
    const cell = ws.getRow(templateRowNum).getCell(c)
    cell.font = bodyFont
    cell.alignment = centerAlign
    cell.border = thinBorder
    // 身份证列文本格式
    if (c === 4) cell.numFmt = '@'
    // 日期列
    if (c === 7 || c === 8 || c === 9 || c === 10) cell.numFmt = 'yyyy-mm-dd'
  }
  ws.getRow(templateRowNum).height = 22

  // 预留几行模板行（实际导出时会动态插行）
  for (let r = 6; r <= 10; r++) {
    for (let c = 1; c <= 13; c++) {
      const cell = ws.getRow(r).getCell(c)
      cell.border = thinBorder
      cell.font = bodyFont
      cell.alignment = centerAlign
      if (c === 4) cell.numFmt = '@'
      if (c >= 7 && c <= 10) cell.numFmt = 'yyyy-mm-dd'
    }
    ws.getRow(r).height = 22
  }

  // 第11行：签字区域
  ws.getRow(12).height = 24
  ws.mergeCells('A12:D12')
  ws.getCell('A12').value = '填表人：'
  ws.getCell('A12').font = bodyFont
  ws.getCell('A12').alignment = leftAlign
  ws.mergeCells('E12:H12')
  ws.getCell('E12').value = '安全员：'
  ws.getCell('E12').font = bodyFont
  ws.getCell('E12').alignment = leftAlign
  ws.mergeCells('I12:M12')
  ws.getCell('I12').value = '项目负责人：'
  ws.getCell('I12').font = bodyFont
  ws.getCell('I12').alignment = leftAlign

  // 打印设置
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  }

  await wb.xlsx.writeFile(path.join(outDir, 'ledger_education.xlsx'))
  console.log('✅ 创建 ledger_education.xlsx')
}

async function createHazardLedger() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('隐患排查治理动态台账')

  ws.columns = [
    { width: 6 },   // 序号
    { width: 12 },  // 检查日期
    { width: 16 },  // 检查部位/区域
    { width: 30 },  // 隐患内容
    { width: 10 },  // 隐患类别
    { width: 10 },  // 风险等级
    { width: 12 },  // 整改责任人
    { width: 22 },  // 分包单位
    { width: 12 },  // 整改期限
    { width: 12 },  // 整改完成日期
    { width: 10 },  // 复查人
    { width: 14 },  // 状态
    { width: 18 },  // 备注
  ]

  ws.mergeCells('A1:M1')
  ws.getCell('A1').value = '安全隐患排查治理动态台账'
  ws.getCell('A1').font = titleFont
  ws.getCell('A1').alignment = centerAlign
  ws.getRow(1).height = 32

  ws.mergeCells('A2:C2')
  ws.getCell('A2').value = '工程名称：'
  ws.getCell('D2').value = '{PROJECT_NAME}'
  ws.mergeCells('D2:H2')
  ws.getCell('I2').value = '统计周期：'
  ws.getCell('J2').value = '{DATE_RANGE}'
  ws.mergeCells('J2:M2')
  ws.getRow(2).height = 22
  ;['A2','D2','I2','J2'].forEach(addr => {
    ws.getCell(addr).font = { name: '宋体', size: 10 }
    ws.getCell(addr).alignment = leftAlign
  })

  const headers = ['序号', '检查日期', '检查部位', '隐患内容', '类别', '风险等级', '整改责任人', '责任单位', '整改期限', '完成日期', '复查人', '状态', '备注']
  headers.forEach((h, i) => {
    const cell = ws.getRow(3).getCell(i + 1)
    cell.value = h
    cell.font = headerFont
    cell.alignment = centerAlign
    cell.fill = headerFill
    cell.border = thinBorder
  })
  ws.getRow(3).height = 28

  // 模板数据行 第4行
  const templateRowNum = 4
  for (let c = 1; c <= 13; c++) {
    const cell = ws.getRow(templateRowNum).getCell(c)
    cell.font = bodyFont
    cell.alignment = centerAlign
    cell.border = thinBorder
    if (c === 2 || c === 9 || c === 10) cell.numFmt = 'yyyy-mm-dd'
  }
  ws.getRow(templateRowNum).height = 30

  for (let r = 5; r <= 10; r++) {
    for (let c = 1; c <= 13; c++) {
      const cell = ws.getRow(r).getCell(c)
      cell.border = thinBorder
      cell.font = bodyFont
      cell.alignment = centerAlign
      if (c === 2 || c === 9 || c === 10) cell.numFmt = 'yyyy-mm-dd'
    }
    ws.getRow(r).height = 30
  }

  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5 },
  }

  await wb.xlsx.writeFile(path.join(outDir, 'ledger_hazard.xlsx'))
  console.log('✅ 创建 ledger_hazard.xlsx')
}

async function createWorkerRoster() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('作业人员花名册')

  ws.columns = [
    { width: 6 },   // 序号
    { width: 12 },  // 姓名
    { width: 8 },   // 性别
    { width: 6 },   // 年龄
    { width: 20 },  // 身份证号
    { width: 14 },  // 工种
    { width: 12 },  // 特种证号
    { width: 22 },  // 分包单位
    { width: 12 },  // 进场日期
    { width: 12 },  // 退场日期
    { width: 10 },  // 状态
    { width: 14 },  // 联系电话
    { width: 16 },  // 备注
  ]

  ws.mergeCells('A1:M1')
  ws.getCell('A1').value = '施工现场作业人员花名册'
  ws.getCell('A1').font = titleFont
  ws.getCell('A1').alignment = centerAlign
  ws.getRow(1).height = 32

  ws.mergeCells('A2:C2')
  ws.getCell('A2').value = '工程名称：'
  ws.getCell('D2').value = '{PROJECT_NAME}'
  ws.mergeCells('D2:H2')
  ws.getCell('I2').value = '统计日期：'
  ws.getCell('J2').value = '{DATE}'
  ws.mergeCells('J2:M2')
  ws.getRow(2).height = 22
  ;['A2','D2','I2','J2'].forEach(addr => {
    ws.getCell(addr).font = { name: '宋体', size: 10 }
    ws.getCell(addr).alignment = leftAlign
  })

  const headers = ['序号', '姓名', '性别', '年龄', '身份证号', '工种', '特种作业证号', '分包单位', '进场日期', '退场日期', '状态', '联系电话', '备注']
  headers.forEach((h, i) => {
    const cell = ws.getRow(3).getCell(i + 1)
    cell.value = h
    cell.font = headerFont
    cell.alignment = centerAlign
    cell.fill = headerFill
    cell.border = thinBorder
  })
  ws.getRow(3).height = 28

  const templateRowNum = 4
  for (let c = 1; c <= 13; c++) {
    const cell = ws.getRow(templateRowNum).getCell(c)
    cell.font = bodyFont
    cell.alignment = centerAlign
    cell.border = thinBorder
    if (c === 5) cell.numFmt = '@'
    if (c === 9 || c === 10) cell.numFmt = 'yyyy-mm-dd'
  }
  ws.getRow(templateRowNum).height = 22

  for (let r = 5; r <= 10; r++) {
    for (let c = 1; c <= 13; c++) {
      const cell = ws.getRow(r).getCell(c)
      cell.border = thinBorder
      cell.font = bodyFont
      cell.alignment = centerAlign
      if (c === 5) cell.numFmt = '@'
      if (c === 9 || c === 10) cell.numFmt = 'yyyy-mm-dd'
    }
    ws.getRow(r).height = 22
  }

  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5 },
  }

  await wb.xlsx.writeFile(path.join(outDir, 'ledger_worker.xlsx'))
  console.log('✅ 创建 ledger_worker.xlsx')
}

async function main() {
  await createEducationRoster()
  await createHazardLedger()
  await createWorkerRoster()
  console.log('\n🎉 所有台账模板生成完成，输出到:', outDir)
}

main().catch(err => {
  console.error('生成失败:', err)
  process.exit(1)
})
