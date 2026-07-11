import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('测试表')

  sheet.getCell('A1').value = '大理机场安全检查表'
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A2').value = '检查项目'
  sheet.getCell('B2').value = '检查结果'
  sheet.getCell('C2').value = '备注'
  sheet.getCell('A3').value = '安全帽佩戴'
  sheet.getCell('B3').value = '合格'
  sheet.getCell('C3').value = '现场抽查10人'
  sheet.getCell('A4').value = '临边防护'
  sheet.getCell('B4').value = '需整改'
  sheet.getCell('C4').value = '北侧缺少两道栏杆'

  sheet.columns = [
    { width: 20 },
    { width: 12 },
    { width: 30 },
  ]

  const outDir = path.resolve(__dirname, '../test-files')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'sample-checklist.xlsx')
  await workbook.xlsx.writeFile(outPath)
  console.log('created:', outPath)
}

main().catch(console.error)
