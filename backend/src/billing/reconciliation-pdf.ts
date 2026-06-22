import * as fs from 'fs'

const PDFDocument = require('pdfkit')

const pickFontPath = () => {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  ]
  return candidates.find(candidate => fs.existsSync(candidate)) || ''
}

const formatMoney = (value: number) => `${Number(value || 0).toLocaleString('ru-RU')} ₸`
const formatDate = (value?: Date | string | null) => value ? new Date(value).toLocaleDateString('ru-RU') : ''
const formatDateShort = (value?: string) => value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }) : ''

export const renderReconciliationPdf = async (data: any) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  const fontPath = pickFontPath()
  if (fontPath) doc.font(fontPath)

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const margin = 40
  let y = margin

  // ============ ШАПКА ДОКУМЕНТА ============
  doc.fontSize(18).text('Сверка по компании', margin, y)
  y = doc.y + 6

  doc.fontSize(10).text(data.company?.name || '', margin, y)
  y = doc.y + 4

  if (data.company?.billingAddress) {
    doc.text(`Адрес: ${data.company.billingAddress}`, margin, y)
    y = doc.y + 4
  }
  if (data.company?.billingDetails) {
    doc.text(`Реквизиты: ${data.company.billingDetails}`, margin, y)
    y = doc.y + 4
  }
  doc.text(`Период: ${formatDate(data.period?.start)} - ${formatDate(data.period?.end)} (${data.period?.days} дн.)`, margin, y)
  y = doc.y + 14

  // ============ СВОДКА ============
  doc.fontSize(12).text('Сводка', margin, y)
  y = doc.y + 4

  doc.fontSize(10)
  doc.text(`Дней с заказами: ${data.summary?.daysWithOrders || 0}`, margin, y)
  y = doc.y + 4
  doc.text(`Закрытых дней: ${data.summary?.closedDays || 0}`, margin, y)
  y = doc.y + 4
  doc.text(`Открытых дней: ${data.summary?.openDays || 0}`, margin, y)
  y = doc.y + 4

  const daysWithDev = data.summary?.daysWithDeviation || 0
  if (daysWithDev > 0) {
    doc.fillColor('#cc0000').text(`Дней с отклонениями: ${daysWithDev}`, margin, y).fillColor('#000')
    y = doc.y + 4
  }

  y += 12

  // ============ ТАБЛИЦА ПО ДНЯМ ============
  const cols = {
    date: margin,
    dish: 155,
    qty: 350,
    price: 400,
    sum: 480,
  }

  const drawTableHeader = () => {
    doc.fontSize(9).fillColor('#333')
    doc.text('Дата', cols.date, y)
    doc.text('Блюдо / Категория', cols.dish, y)
    doc.text('Кол-во', cols.qty, y)
    doc.text('Цена', cols.price, y)
    doc.text('Сумма', cols.sum, y)
    y += 16
    doc.lineWidth(0.5).moveTo(margin, y - 3).lineTo(555, y - 3).strokeColor('#999').stroke()
    y += 2
  }

  const checkPage = (needed: number) => {
    if (y + needed > 750) {
      doc.addPage()
      if (fontPath) doc.font(fontPath)
      y = margin
      drawTableHeader()
    }
  }

  drawTableHeader()

  const rows = data.rows || []
  for (const row of rows) {
    if (!row.dishes || row.dishes.length === 0) {
      checkPage(20)
      doc.fontSize(9).fillColor('#333')
      doc.text(formatDateShort(row.date), cols.date, y)
      doc.text(`${row.portions} порций`, cols.dish, y)
      doc.text(formatMoney(row.subtotal), cols.sum, y)
      y += 16
      doc.lineWidth(0.3).moveTo(margin, y - 2).lineTo(555, y - 2).strokeColor('#ddd').stroke()
      continue
    }

    // Day header
    checkPage(30 + row.dishes.length * 16)
    doc.fontSize(10).fillColor('#111')
    doc.text(formatDateShort(row.date), cols.date, y)
    doc.fontSize(9).fillColor('#666')
    doc.text(`${row.portions} порций, ${row.usersCount} сотр.`, cols.dish, y)
    doc.fontSize(10).fillColor('#111')
    doc.text(formatMoney(row.total), cols.sum, y)
    y += 16

    // Deviation
    if (row.deviationAmount) {
      doc.fontSize(8).fillColor('#cc0000')
      doc.text(`Отклонение: ${formatMoney(row.deviationAmount)}${row.deviationComment ? ' — ' + row.deviationComment : ''}`, margin, y)
      y += 14
    }

    // Dishes
    for (const dish of row.dishes) {
      const unitPrice = dish.total / dish.quantity
      doc.fontSize(9).fillColor('#444')
      doc.text(dish.dishName, cols.dish, y, { width: 190 })
      const lineEnd = doc.y
      doc.fontSize(9).fillColor('#444')
      doc.text(String(dish.quantity), cols.qty, y)
      doc.text(formatMoney(unitPrice), cols.price, y)
      doc.text(formatMoney(dish.total), cols.sum, y)
      y = Math.max(lineEnd, y + 14)
      checkPage(16)
    }

    // Separator
    doc.lineWidth(0.3).moveTo(margin, y - 2).lineTo(555, y - 2).strokeColor('#ddd').stroke()
  }

  // ============ ИТОГИ ============
  y += 14
  checkPage(60)
  doc.fontSize(11).fillColor('#333')
  doc.text(`Общая стоимость заказов: ${formatMoney(data.summary?.subtotal)}`, 300, y)
  y += 18
  if (data.summary?.deviationTotal) {
    doc.text(`Отклонения: ${formatMoney(data.summary?.deviationTotal)}`, 300, y)
    y += 18
  }
  doc.fontSize(14).fillColor('#000')
  doc.text(`Итого: ${formatMoney(data.summary?.total)}`, 280, y)

  doc.end()
  return done
}
