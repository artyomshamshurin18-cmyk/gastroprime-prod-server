import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from './api-config';


const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10)

const statusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'На рассмотрении',
  CONFIRMED: 'Подтверждено',
  REJECTED: 'Отклонено',
  COMPLETED: 'Выполнено'
}

const defaultStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED']
const routeBadgeColors = ['#0d6efd', '#198754', '#fd7e14', '#6f42c1', '#20c997', '#dc3545']

interface KitchenSummary {
  date: string
  statuses: string[]
  summary: {
    selectionsCount: number
    companiesCount: number
    dishesCount: number
    totalPortions: number
    totalUtensils: number
    needBreadCount: number
    notesCount: number
  }
  dishes: Array<{
    dishId: string
    dishName: string
    categoryName: string
    weight: number
    measureUnit: string
    totalQuantity: number
    productionAmount: number
    productionUnitLabel: string
    portionUnitLabel: string
    companies: Array<{
      companyName: string
      quantity: number
    }>
  }>
  companies: Array<{
    companyId: string | null
    companyName: string
    contactPerson: string
    address: string
    entryConditions: string
    routeName: string
    deliveryTime: string
    selectionsCount: number
    totalPortions: number
    utensilsTotal: number
    needBreadCount: number
    deliveryClosing: null | {
      status: string
      deviationAmount: number
      deviationComment: string
      managerComment: string
      updatedAt: string
    }
    dishes: Array<{
      dishName: string
      categoryName: string
      quantity: number
    }>
    users: Array<{
      userId: string
      userName: string
      email: string
      status: string
      utensils: number
      needBread: boolean
      notes: string
      items: Array<{
        dishName: string
        categoryName: string
        quantity: number
      }>
    }>
  }>
  notes: Array<{
    companyName: string
    userName: string
    note: string
  }>
}

export default function AdminKitchenSummary({ token }: { token: string }) {
  const getRouteBadgeStyle = (route: string) => {
    const key = route || 'Без рейса'
    const index = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0) % routeBadgeColors.length
    const color = routeBadgeColors[index]
    return {
      background: color,
      color: '#fff',
      padding: '4px 10px',
      borderRadius: 999,
      display: 'inline-block',
      fontSize: 13,
      fontWeight: 700,
    } as const
  }

  const buildMapLink = (address?: string) => {
    if (!address) return ''
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }
  const [date, setDate] = useState(() => toDateInputValue(new Date()))
  const [statuses, setStatuses] = useState<string[]>(defaultStatuses)
  const [data, setData] = useState<KitchenSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [closingDrafts, setClosingDrafts] = useState<Record<string, any>>({})
  const [savingClosingId, setSavingClosingId] = useState('')

  const loadSummary = async () => {
    if (!date) {
      setError('Выберите дату')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/admin/kitchen-summary?date=${date}&statuses=${statuses.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setData(response.data)
      setClosingDrafts(Object.fromEntries((response.data.companies || []).filter((company: any) => company.companyId).map((company: any) => [company.companyId, {
        status: company.deliveryClosing?.status || 'DELIVERED',
        deviationAmount: company.deliveryClosing?.deviationAmount || 0,
        deviationComment: company.deliveryClosing?.deviationComment || '',
        managerComment: company.deliveryClosing?.managerComment || '',
      }])))
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || 'Не удалось загрузить сводку')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [])

  const toggleStatus = (status: string) => {
    setStatuses(prev => prev.includes(status) ? prev.filter(item => item !== status) : [...prev, status])
  }

  const updateClosingDraft = (companyId: string, field: string, value: any) => {
    setClosingDrafts(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value,
      }
    }))
  }

  const saveClosing = async (companyId: string) => {
    const draft = closingDrafts[companyId]
    if (!draft) return

    setSavingClosingId(companyId)
    setError('')
    try {
      await axios.patch(`${API_URL}/admin/delivery-closing`, {
        companyId,
        date,
        status: draft.status,
        deviationAmount: Number(draft.deviationAmount) || 0,
        deviationComment: draft.deviationComment || '',
        managerComment: draft.managerComment || '',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await loadSummary()
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || 'Не удалось сохранить отметку доставки')
    } finally {
      setSavingClosingId('')
    }
  }

  const groupedProduction = data?.dishes.reduce((acc, dish) => {
    if (!acc[dish.categoryName]) acc[dish.categoryName] = []
    acc[dish.categoryName].push(dish)
    return acc
  }, {} as Record<string, KitchenSummary['dishes']>) || {}

  const routeGroups = Object.values(
    (data?.companies || [])
      .slice()
      .sort((a, b) => (a.routeName || '').localeCompare(b.routeName || '', 'ru') || (a.deliveryTime || '').localeCompare(b.deliveryTime || '', 'ru') || a.companyName.localeCompare(b.companyName, 'ru'))
      .reduce((acc, company) => {
        const route = company.routeName || 'Без рейса'
        const window = company.deliveryTime || 'Без окна'
        if (!acc[route]) {
          acc[route] = { route, windows: {} as Record<string, KitchenSummary['companies']> }
        }
        if (!acc[route].windows[window]) {
          acc[route].windows[window] = []
        }
        acc[route].windows[window].push(company)
        return acc
      }, {} as Record<string, { route: string, windows: Record<string, KitchenSummary['companies']> }>)
  ).map(group => ({
    route: group.route,
    windows: Object.entries(group.windows).map(([window, companies]) => ({ window, companies }))
  }))

  const exportToExcel = async () => {
    if (!date) {
      setError('Выберите дату')
      return
    }

    setExporting(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/admin/kitchen-summary/export?date=${date}&statuses=${statuses.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `kitchen-summary-${date}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || 'Не удалось выгрузить Excel')
    } finally {
      setExporting(false)
    }
  }

  const printSummary = () => {
    if (!data) {
      setError('Сначала загрузите сводку за нужную дату')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      setError('Не удалось открыть окно печати')
      return
    }

    const summaryCards = `
      <div class="grid">
        <div class="card"><div class="muted">Заявок</div><strong>${data.summary.selectionsCount}</strong></div>
        <div class="card"><div class="muted">Компаний</div><strong>${data.summary.companiesCount}</strong></div>
        <div class="card"><div class="muted">Порций</div><strong>${data.summary.totalPortions}</strong></div>
        <div class="card"><div class="muted">Приборов</div><strong>${data.summary.totalUtensils}</strong></div>
        <div class="card"><div class="muted">Нужен хлеб</div><strong>${data.summary.needBreadCount}</strong></div>
        <div class="card"><div class="muted">Заметок</div><strong>${data.summary.notesCount}</strong></div>
      </div>
    `

    const productionHtml = Object.entries(data.dishes.reduce((acc, dish) => {
      if (!acc[dish.categoryName]) acc[dish.categoryName] = []
      acc[dish.categoryName].push(dish)
      return acc
    }, {} as Record<string, typeof data.dishes>)).map(([category, dishes]) => `
      <div class="company-block">
        <h3>${category}</h3>
        <div class="list">${dishes.map(dish => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.totalQuantity} = ${Number(dish.productionAmount || 0).toFixed(dish.measureUnit === 'PCS' ? 0 : 2)} ${dish.productionUnitLabel}`).join(' • ')}</div>
      </div>
    `).join('')

    const dishesRows = data.dishes.map(dish => `
      <tr>
        <td>${dish.categoryName}</td>
        <td>${dish.dishName}</td>
        <td>${dish.totalQuantity}</td>
        <td>${dish.companies.map(company => `${company.companyName}: ${company.quantity}`).join(', ')}</td>
      </tr>
    `).join('')

    const logisticsGroups = (data.companies || [])
      .slice()
      .sort((a, b) => (a.routeName || '').localeCompare(b.routeName || '', 'ru') || (a.deliveryTime || '').localeCompare(b.deliveryTime || '', 'ru') || a.companyName.localeCompare(b.companyName, 'ru'))
      .reduce((acc, company) => {
        const route = company.routeName || 'Без рейса'
        const window = company.deliveryTime || 'Без окна'
        const key = `${route}|||${window}`
        if (!acc[key]) acc[key] = { route, window, companies: [] as typeof data.companies }
        acc[key].companies.push(company)
        return acc
      }, {} as Record<string, { route: string, window: string, companies: typeof data.companies }>)

    const companiesHtml = Object.values(logisticsGroups).map(group => `
      <div class="section">
        <h2>${group.route} • ${group.window}</h2>
        ${group.companies.map(company => `
          <div class="company-block">
            <h3>${company.companyName}</h3>
            <div class="meta">Заявок: ${company.selectionsCount} • Порций: ${company.totalPortions} • Приборов: ${company.utensilsTotal} • Хлеб: ${company.needBreadCount}</div>
            ${company.contactPerson ? `<div class="muted">Контакт: ${company.contactPerson}</div>` : ''}
            ${company.address ? `<div class="muted">Адрес: ${company.address}</div>` : ''}
            ${company.entryConditions ? `<div class="muted">Телефон: ${company.entryConditions}</div>` : ''}
            <div class="list">${company.dishes.map(dish => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.quantity}`).join(' • ')}</div>
            ${company.users.length ? `
              <div class="users">
                ${company.users.map(user => `
                  <div class="user-row">
                    <strong>${user.userName}</strong> (${user.email})<br/>
                    ${user.items.map(item => `${item.dishName}${item.garnishDishName ? ' (' + item.garnishDishName + ')' : ''} × ${item.quantity}`).join(' • ')}<br/>
                    <span class="muted">Приборов: ${user.utensils}, хлеб: ${user.needBread ? 'да' : 'нет'}${user.notes ? `, примечание: ${user.notes}` : ''}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `).join('')

    const notesHtml = data.notes.length
      ? `<div class="section"><h2>Особые заметки</h2>${data.notes.map(note => `<div class="note"><strong>${note.companyName} / ${note.userName}:</strong> ${note.note}</div>`).join('')}</div>`
      : ''

    printWindow.document.write(`
      <html>
        <head>
          <title>Сводка кухни ${data.date}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            h1, h2, h3 { margin: 0 0 10px 0; }
            .muted { color: #666; font-size: 12px; }
            .section { margin-top: 18px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f2f2f2; }
            .company-block { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
            .meta { color: #444; font-size: 12px; margin-bottom: 8px; }
            .list { margin-bottom: 8px; font-size: 12px; }
            .user-row { padding: 8px 0; border-top: 1px solid #eee; font-size: 12px; }
            .user-row:first-child { border-top: 0; }
            .note { margin-bottom: 6px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Сводка для кухни</h1>
          <div class="muted">Дата: ${data.date} • Статусы: ${data.statuses.map(status => statusLabels[status] || status).join(', ')}</div>
          ${summaryCards}
          <div class="section">
            <h2>Производственный лист по категориям</h2>
            ${productionHtml || '<div class="muted">Нет данных</div>'}
          </div>
          <div class="section">
            <h2>Что готовить</h2>
            <table>
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Блюдо</th>
                  <th>Порций</th>
                  <th>Компании</th>
                </tr>
              </thead>
              <tbody>${dishesRows || '<tr><td colspan="4">Нет данных</td></tr>'}</tbody>
            </table>
          </div>
          <div class="section">
            <h2>По компаниям</h2>
            ${companiesHtml || '<div class="muted">Нет данных</div>'}
          </div>
          ${notesHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  const printDriverSheet = (routeGroup: { route: string, windows: { window: string, companies: KitchenSummary['companies'] }[] }) => {
    if (!data) {
      setError('Сначала загрузите сводку за нужную дату')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=900')
    if (!printWindow) {
      setError('Не удалось открыть окно печати')
      return
    }

    const totalCompanies = routeGroup.windows.reduce((sum, group) => sum + group.companies.length, 0)
    const totalPortions = routeGroup.windows.reduce((sum, group) => sum + group.companies.reduce((inner, company) => inner + company.totalPortions, 0), 0)
    const totalUtensils = routeGroup.windows.reduce((sum, group) => sum + group.companies.reduce((inner, company) => inner + company.utensilsTotal, 0), 0)
    const totalBread = routeGroup.windows.reduce((sum, group) => sum + group.companies.reduce((inner, company) => inner + company.needBreadCount, 0), 0)

    const windowsHtml = routeGroup.windows.map(group => `
      <div class="window-block">
        <h2>${group.window}</h2>
        ${group.companies.map(company => `
          <div class="company-block">
            <div class="company-head">
              <div>
                <h3>${company.companyName}</h3>
                ${company.contactPerson ? `<div class="contact-big">Контакт: ${company.contactPerson}</div>` : ''}
                ${company.address ? `<div class="muted">Адрес: ${company.address}</div>` : ''}
                ${company.address ? `<div class="nav-link">Навигация: <a href="${buildMapLink(company.address)}" target="_blank">Открыть маршрут</a></div>` : ''}
                ${company.entryConditions ? `<div class="warn">Телефон: ${company.entryConditions}</div>` : ''}
              </div>
              <div class="totals">
                <div><strong>${company.totalPortions}</strong> порц.</div>
                <div>Приборов: <strong>${company.utensilsTotal}</strong></div>
                <div>Хлеб: <strong>${company.needBreadCount}</strong></div>
              </div>
            </div>
            <div class="cargo">${company.dishes.map(dish => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.quantity}`).join(' • ')}</div>
            <div class="checks">
              <span><span class="box"></span> Отгружено</span>
              <span><span class="box"></span> Доставлено</span>
              <span>Время: __________</span>
              <span>Подпись: __________________</span>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Лист водителя ${routeGroup.route} ${data.date}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            h1, h2, h3 { margin: 0 0 8px 0; }
            .muted { color: #555; font-size: 12px; }
            .warn { color: #8a6d3b; font-size: 12px; }
            .contact-big { font-size: 16px; font-weight: 700; margin-top: 4px; }
            .nav-link { font-size: 12px; margin-top: 4px; }
            .nav-link a { color: #0d6efd; text-decoration: none; }
            .top { margin-bottom: 14px; }
            .badge { display: inline-block; background: #111; color: #fff; border-radius: 999px; padding: 6px 12px; font-weight: 700; margin-bottom: 8px; }
            .meta { font-size: 13px; color: #444; }
            .window-block { margin-top: 16px; }
            .company-block { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-top: 10px; page-break-inside: avoid; }
            .company-head { display: flex; justify-content: space-between; gap: 12px; }
            .totals { text-align: right; font-size: 13px; }
            .cargo { margin-top: 8px; font-size: 13px; }
            .checks { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; }
            .box { display: inline-block; width: 12px; height: 12px; border: 1px solid #111; margin-right: 6px; vertical-align: middle; }
          </style>
        </head>
        <body>
          <div class="top">
            <div class="badge">${routeGroup.route}</div>
            <h1>Лист водителя</h1>
            <div class="meta">Дата: ${data.date} • Компаний: ${totalCompanies} • Порций: ${totalPortions} • Приборов: ${totalUtensils} • Хлеб: ${totalBread}</div>
          </div>
          ${windowsHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  const printAllDriverSheets = () => {
    if (!data || routeGroups.length === 0) {
      setError('Нет данных по рейсам для печати')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      setError('Не удалось открыть окно печати')
      return
    }

    const routesHtml = routeGroups.map(routeGroup => {
      const totalCompanies = routeGroup.windows.reduce((sum, group) => sum + group.companies.length, 0)
      const totalPortions = routeGroup.windows.reduce((sum, group) => sum + group.companies.reduce((inner, company) => inner + company.totalPortions, 0), 0)
      const totalUtensils = routeGroup.windows.reduce((sum, group) => sum + group.companies.reduce((inner, company) => inner + company.utensilsTotal, 0), 0)
      const totalBread = routeGroup.windows.reduce((sum, group) => sum + group.companies.reduce((inner, company) => inner + company.needBreadCount, 0), 0)
      return `
        <section class="route-page">
          <div class="badge">${routeGroup.route}</div>
          <h1>Лист водителя</h1>
          <div class="meta">Дата: ${data.date} • Компаний: ${totalCompanies} • Порций: ${totalPortions} • Приборов: ${totalUtensils} • Хлеб: ${totalBread}</div>
          ${routeGroup.windows.map(group => `
            <div class="window-block">
              <h2>${group.window}</h2>
              ${group.companies.map(company => `
                <div class="company-block">
                  <div class="company-head">
                    <div>
                      <h3>${company.companyName}</h3>
                      ${company.contactPerson ? `<div class="contact-big">Контакт: ${company.contactPerson}</div>` : ''}
                      ${company.address ? `<div class="muted">Адрес: ${company.address}</div>` : ''}
                      ${company.address ? `<div class="nav-link">Навигация: <a href="${buildMapLink(company.address)}" target="_blank">Открыть маршрут</a></div>` : ''}
                      ${company.entryConditions ? `<div class="warn">Телефон: ${company.entryConditions}</div>` : ''}
                    </div>
                    <div class="totals">
                      <div><strong>${company.totalPortions}</strong> порц.</div>
                      <div>Приборов: <strong>${company.utensilsTotal}</strong></div>
                      <div>Хлеб: <strong>${company.needBreadCount}</strong></div>
                    </div>
                  </div>
                  <div class="cargo">${company.dishes.map(dish => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.quantity}`).join(' • ')}</div>
                  <div class="checks">
                    <span><span class="box"></span> Отгружено</span>
                    <span><span class="box"></span> Доставлено</span>
                    <span>Время: __________</span>
                    <span>Подпись: __________________</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </section>
      `
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Листы водителя ${data.date}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            h1, h2, h3 { margin: 0 0 8px 0; }
            .muted { color: #555; font-size: 12px; }
            .warn { color: #8a6d3b; font-size: 12px; }
            .contact-big { font-size: 16px; font-weight: 700; margin-top: 4px; }
            .nav-link { font-size: 12px; margin-top: 4px; }
            .nav-link a { color: #0d6efd; text-decoration: none; }
            .badge { display: inline-block; background: #111; color: #fff; border-radius: 999px; padding: 6px 12px; font-weight: 700; margin-bottom: 8px; }
            .meta { font-size: 13px; color: #444; }
            .window-block { margin-top: 16px; }
            .company-block { border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-top: 10px; page-break-inside: avoid; }
            .company-head { display: flex; justify-content: space-between; gap: 12px; }
            .totals { text-align: right; font-size: 13px; }
            .cargo { margin-top: 8px; font-size: 13px; }
            .checks { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; font-size: 12px; }
            .box { display: inline-block; width: 12px; height: 12px; border: 1px solid #111; margin-right: 6px; vertical-align: middle; }
            .route-page { page-break-after: always; margin-bottom: 12px; }
            .route-page:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>${routesHtml}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  const printPackagingSheet = () => {
    if (!data) {
      setError('Сначала загрузите сводку за нужную дату')
      return
    }

    const rows = routeGroups.flatMap(routeGroup =>
      routeGroup.windows.flatMap(group =>
        group.companies.flatMap(company =>
          company.users.map(user => ({
            route: routeGroup.route,
            window: group.window,
            company: company.companyName,
            user: user.userName,
            email: user.email,
            items: user.items.map(item => `${item.dishName}${item.garnishDishName ? ' (' + item.garnishDishName + ')' : ''} × ${item.quantity}`).join(' • '),
            utensils: user.utensils,
            bread: user.needBread ? 'Да' : 'Нет',
            note: user.notes || '',
          }))
        )
      )
    )

    const printWindow = window.open('', '_blank', 'width=1300,height=900')
    if (!printWindow) {
      setError('Не удалось открыть окно печати')
      return
    }

    const tableRows = rows.map(row => `
      <tr>
        <td>${row.route}</td>
        <td>${row.window}</td>
        <td>${row.company}</td>
        <td>${row.user}</td>
        <td>${row.items}</td>
        <td>${row.utensils}</td>
        <td>${row.bread}</td>
        <td>${row.note}</td>
        <td style="text-align:center">☐</td>
        <td style="text-align:center">☐</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Фасовка ${data.date}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: Arial, sans-serif; color: #111; margin: 0; }
            h1 { margin: 0 0 8px 0; }
            .meta { color: #555; font-size: 13px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Лист фасовки</h1>
          <div class="meta">Дата: ${data.date}</div>
          <table>
            <thead>
              <tr>
                <th>Рейс</th>
                <th>Окно</th>
                <th>Компания</th>
                <th>Сотрудник</th>
                <th>Что упаковать</th>
                <th>Приборы</th>
                <th>Хлеб</th>
                <th>Примечание</th>
                <th>Собрано</th>
                <th>Проверено</th>
              </tr>
            </thead>
            <tbody>${tableRows || '<tr><td colspan="10">Нет данных</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  return (
    <div>
      <h2 className="gp-page-title">Сводка на день для кухни</h2>
      <p className="gp-page-lead">
        Здесь собраны клиентские заявки на выбранную дату. Можно быстро увидеть, сколько каких блюд готовить и от каких компаний пришел выбор.
      </p>

      <div className="gp-surface-card" style={{ padding: 20, marginBottom: 20 }}>
        <div className="gp-toolbar" style={{ marginBottom: 15 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={loadSummary} disabled={loading} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            {loading ? 'Загрузка...' : 'Показать сводку'}
          </button>
          <button onClick={exportToExcel} disabled={exporting} style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            {exporting ? 'Готовлю Excel...' : 'Скачать Excel'}
          </button>
          <button onClick={printSummary} style={{ background: '#6f42c1', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            Печать кухни
          </button>
          <button onClick={printPackagingSheet} style={{ background: '#fd7e14', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            Печать фасовки
          </button>
          <button onClick={printAllDriverSheets} style={{ background: '#212529', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            Печать водителей
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.keys(statusLabels).map(status => (
            <label key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 999, padding: '8px 12px' }}>
              <input type="checkbox" checked={statuses.includes(status)} onChange={() => toggleStatus(status)} />
              <span>{statusLabels[status]}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#f8d7da', color: '#721c24', borderRadius: 6, marginBottom: 20 }}>{error}</div>}

      {data && (
        <>
          <div className="gp-grid-cards" style={{ marginBottom: 20 }}>
            <div className="gp-stat-card"><div className="gp-muted-text">Заявок</div><strong>{data.summary.selectionsCount}</strong></div>
            <div className="gp-stat-card"><div className="gp-muted-text">Компаний</div><strong>{data.summary.companiesCount}</strong></div>
            <div className="gp-stat-card"><div className="gp-muted-text">Порций</div><strong>{data.summary.totalPortions}</strong></div>
            <div className="gp-stat-card"><div className="gp-muted-text">Приборов</div><strong>{data.summary.totalUtensils}</strong></div>
            <div className="gp-stat-card"><div className="gp-muted-text">Нужен хлеб</div><strong>{data.summary.needBreadCount}</strong></div>
            <div className="gp-stat-card"><div className="gp-muted-text">Особые заметки</div><strong>{data.summary.notesCount}</strong></div>
          </div>

          <div className="gp-surface-card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Производственный лист по категориям</h3>
            {data.dishes.length === 0 ? (
              <p>На выбранную дату заявок нет</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {Object.entries(groupedProduction).map(([category, dishes]) => (
                  <div key={category} className="gp-soft-block" style={{ padding: 14 }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>{category}</strong>
                    <div style={{ color: '#333' }}>{dishes.map(dish => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.totalQuantity} = ${Number(dish.productionAmount || 0).toFixed(dish.measureUnit === 'PCS' ? 0 : 2)} ${dish.productionUnitLabel}`).join(' • ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="gp-surface-card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Что готовить</h3>
            {data.dishes.length === 0 ? (
              <p>На выбранную дату заявок нет</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {data.dishes.map(dish => (
                  <div key={dish.dishId} className="gp-soft-block" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <strong>{dish.dishName}{dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''}</strong>
                        <div style={{ color: '#666' }}>{dish.categoryName}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#28a745', textAlign: 'right' }}>
                        <div>{dish.totalQuantity} порц.</div>
                        <div style={{ fontSize: 14 }}>{Number(dish.productionAmount || 0).toFixed(dish.measureUnit === 'PCS' ? 0 : 2)} {dish.productionUnitLabel}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, color: '#666' }}>
                      Порция: {dish.weight || 0} {dish.portionUnitLabel} • {dish.companies.map(company => `${company.companyName}: ${company.quantity}`).join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="gp-surface-card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>По компаниям и рейсам</h3>
            {data.companies.length === 0 ? (
              <p>Нет данных по компаниям</p>
            ) : (
              routeGroups.map(routeGroup => (
                <div key={routeGroup.route} style={{ marginBottom: 16 }}>
                  <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={getRouteBadgeStyle(routeGroup.route)}>{routeGroup.route}</span>
                      <span style={{ color: '#666' }}>Окон доставки: {routeGroup.windows.length}</span>
                    </div>
                    <button onClick={() => printDriverSheet(routeGroup)} style={{ background: '#212529', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px' }}>
                      Печать листа водителя
                    </button>
                  </div>

                  {routeGroup.windows.map(group => (
                    <div key={`${routeGroup.route}-${group.window}`} style={{ marginBottom: 12 }}>
                      <div style={{ borderLeft: '4px solid #dee2e6', paddingLeft: 12, marginBottom: 10 }}>
                        <strong>{group.window}</strong>
                      </div>
                      {group.companies.map(company => (
                        <div key={company.companyName} style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                            <div>
                              <strong>{company.companyName}</strong>
                              <div style={{ color: '#666' }}>Заявок: {company.selectionsCount}</div>
                              {company.contactPerson && <div style={{ color: '#666', fontSize: 14 }}>Контакт: {company.contactPerson}</div>}
                              {company.address && <div style={{ color: '#666', fontSize: 14 }}>Адрес: {company.address}</div>}
                              {company.entryConditions && <div style={{ color: '#8a6d3b', fontSize: 14 }}>Телефон: {company.entryConditions}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div>Порций: <strong>{company.totalPortions}</strong></div>
                              <div>Приборов: <strong>{company.utensilsTotal}</strong>, хлеб: <strong>{company.needBreadCount}</strong></div>
                            </div>
                          </div>

                          <div style={{ marginBottom: 10, color: '#333' }}>
                            {company.dishes.map(dish => `${dish.dishName}${dish.garnishDishName ? ' (' + dish.garnishDishName + ')' : ''} × ${dish.quantity}`).join(' • ')}
                          </div>

                          {company.companyId && (
                            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                              <div style={{ fontWeight: 700, marginBottom: 10 }}>Закрытие доставки за день</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                                <select value={closingDrafts[company.companyId]?.status || 'DELIVERED'} onChange={(e) => updateClosingDraft(company.companyId as string, 'status', e.target.value)}>
                                  <option value="DELIVERED">Доставлено</option>
                                  <option value="DELIVERED_WITH_DEVIATION">Доставлено с отклонением</option>
                                </select>
                                <input type="number" min="0" placeholder="Сумма отклонения" value={closingDrafts[company.companyId]?.deviationAmount ?? 0} onChange={(e) => updateClosingDraft(company.companyId as string, 'deviationAmount', parseInt(e.target.value) || 0)} />
                                <input placeholder="Комментарий по отклонению" value={closingDrafts[company.companyId]?.deviationComment || ''} onChange={(e) => updateClosingDraft(company.companyId as string, 'deviationComment', e.target.value)} />
                                <input placeholder="Комментарий менеджера" value={closingDrafts[company.companyId]?.managerComment || ''} onChange={(e) => updateClosingDraft(company.companyId as string, 'managerComment', e.target.value)} />
                              </div>
                              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ color: '#666', fontSize: 13 }}>
                                  {company.deliveryClosing?.updatedAt ? `Последнее обновление: ${new Date(company.deliveryClosing.updatedAt).toLocaleString('ru-RU')}` : 'Отметка доставки еще не сохранена'}
                                </div>
                                <button onClick={() => saveClosing(company.companyId as string)} disabled={savingClosingId === company.companyId} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px' }}>
                                  {savingClosingId === company.companyId ? 'Сохраняю...' : 'Сохранить доставку'}
                                </button>
                              </div>
                            </div>
                          )}

                          <details>
                            <summary style={{ cursor: 'pointer', color: '#007bff' }}>Показать сотрудников и их выбор</summary>
                            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                              {company.users.map(user => (
                                <div key={user.userId} style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                    <div>
                                      <strong>{user.userName}</strong>
                                      <div style={{ color: '#666', fontSize: 14 }}>{user.email}</div>
                                    </div>
                                    <div style={{ color: '#666', fontSize: 14 }}>{statusLabels[user.status] || user.status}</div>
                                  </div>
                                  <div style={{ marginTop: 6, color: '#333' }}>
                                    {user.items.map(item => `${item.dishName}${item.garnishDishName ? ' (' + item.garnishDishName + ')' : ''} × ${item.quantity}`).join(' • ')}
                                  </div>
                                  <div style={{ marginTop: 6, color: '#666', fontSize: 14 }}>
                                    Приборов: {user.utensils}, хлеб: {user.needBread ? 'да' : 'нет'}
                                  </div>
                                  {user.notes && <div style={{ marginTop: 6, color: '#8a6d3b', fontSize: 14 }}>Примечание: {user.notes}</div>}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {data.notes.length > 0 && (
            <div className="gp-surface-card" style={{ background: '#fff8e1', padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>Особые заметки</h3>
              {data.notes.map((item, index) => (
                <div key={`${item.userName}-${index}`} style={{ marginBottom: 8 }}>
                  <strong>{item.companyName} / {item.userName}:</strong> {item.note}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
