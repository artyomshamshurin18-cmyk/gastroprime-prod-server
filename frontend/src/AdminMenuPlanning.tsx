import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { sortCategoryEntries } from './categoryOrder'
import { API_URL } from './api-config';

const formatInputDate = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (value: Date, days: number) => {
  const next = new Date(value)
  next.setHours(12, 0, 0, 0)
  next.setDate(next.getDate() + days)
  return next
}

const buildPlanningDates = (count = 7) => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Array.from({ length: count }, (_, index) => formatInputDate(addDays(today, index + 1)))
}

const formatDateButton = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long'
  })
}

interface Dish {
  id: string
  name: string
  categoryId?: string
  category?: { name: string }
  price: number
}

interface DailyMenuDish {
  id: string
  dishId: string
  name: string
  description?: string
  photoUrl?: string | null
  price: number
  maxQuantity: number
  category: string
  garnishDish?: any | null
}

interface DailyMenuResponse {
  date: string
  items: Record<string, DailyMenuDish[]>
}

interface MenuImportRow {
  rowNumber: number
  date: string
  categoryName: string
  dishName: string
  dishId: string
  maxQuantity: number
  sortOrder: number
  dateAction: 'create' | 'replace'
  errors: string[]
}

interface MenuImportPreview {
  totalRows: number
  validRows: number
  errorRows: number
  dateCount: number
  createDateCount: number
  replaceDateCount: number
  rows: MenuImportRow[]
}

interface SelectedDishDraft {
  dishId: string
  maxQuantity: number
  name: string
  garnishDishId?: string | null
}

interface ExistingMenuItem {
  dishId: string
  name: string
  maxQuantity: number
  garnishDishId?: string | null
}

export default function AdminMenuPlanning({ token }: { token: string }) {
  const [date, setDate] = useState('')
  const [dishes, setDishes] = useState<Dish[]>([])
  const [selectedDishes, setSelectedDishes] = useState<Record<string, SelectedDishDraft>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [importPreview, setImportPreview] = useState<MenuImportPreview | null>(null)
  const [exportStart, setExportStart] = useState(() => formatInputDate(new Date()))
  const [exportEnd, setExportEnd] = useState(() => formatInputDate(addDays(new Date(), 29)))
  const [exporting, setExporting] = useState(false)
  const [garnishPicker, setGarnishPicker] = useState<{ dishId: string; dishName: string } | null>(null)

  // Week calendar state
  const [planningDates, setPlanningDates] = useState<string[]>([])
  const [activeDate, setActiveDate] = useState('')
  const [dailyMenus, setDailyMenus] = useState<DailyMenuResponse[]>([])
  const [existingMenuForDate, setExistingMenuForDate] = useState<Record<string, Record<string, ExistingMenuItem>>>({})
  const [seeding, setSeeding] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { loadDishes() }, [])

  const loadDishes = async () => {
    try {
      const r = await axios.get(`${API_URL}/menu/dishes`, { headers: { Authorization: `Bearer ${token}` } })
      setDishes(r.data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadMenusForRange = async (rangeStart: string, rangeEnd: string) => {
    if (!rangeStart || !rangeEnd) return
    try {
      const url = `${API_URL}/daily-menu/by-range?start=${rangeStart}&end=${rangeEnd}`
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const menus: DailyMenuResponse[] = Array.isArray(response.data) ? response.data : []
      setDailyMenus(menus)

      // Build a lookup of which dishes are already selected per date
      const existing: Record<string, Record<string, ExistingMenuItem>> = {}
      menus.forEach(menu => {
        const dateKey = menu.date.slice(0, 10)
        existing[dateKey] = {}
        Object.values(menu.items).forEach(dishes => {
          dishes.forEach(dish => {
            existing[dateKey][dish.dishId] = {
              dishId: dish.dishId,
              name: dish.name,
              maxQuantity: dish.maxQuantity,
              garnishDishId: dish.garnishDish?.id || null
            }
          })
        })
      })
      setExistingMenuForDate(existing)

      // If there are menus, auto-select the first available date
      const availableDates = menus.map(menu => menu.date.slice(0, 10))
      if (availableDates.length > 0) {
        setActiveDate(prev => prev && availableDates.includes(prev) ? prev : availableDates[0])
      } else if (!activeDate) {
        setActiveDate(planningDates[0] || formatInputDate(addDays(new Date(), 1)))
        setDate(planningDates[0] || formatInputDate(addDays(new Date(), 1)))
      }
    } catch (e) {
      console.error('Error loading menus for range:', e)
    }
  }

  const initWeek = () => {
    const dates = buildPlanningDates(7)
    setPlanningDates(dates)
    setActiveDate(prev => prev && dates.includes(prev) ? prev : dates[0])
    setDate(prev => prev && dates.includes(prev) ? prev : dates[0])
    setSearchQuery('')
    loadMenusForRange(dates[0], dates[dates.length - 1])
  }

  useEffect(() => {
    if (dishes.length > 0) {
      initWeek()
    }
  }, [dishes.length > 0])

  const selectDate = (d: string) => {
    setActiveDate(d)
    setDate(d)

    // Load existing selections for this date
    const existing = existingMenuForDate[d]
    if (existing && Object.keys(existing).length > 0) {
      const sel: Record<string, SelectedDishDraft> = {}
      Object.entries(existing).forEach(([dishId, item]) => {
        sel[dishId] = {
          dishId: item.dishId,
          maxQuantity: item.maxQuantity,
          name: item.name,
          garnishDishId: item.garnishDishId
        }
      })
      setSelectedDishes(sel)
      setGarnishPicker(null)
    } else {
      setSelectedDishes({})
      setGarnishPicker(null)
    }
  }

  const isMainWithGarnishDish = (dish: Dish) => {
    const catName = dish.category?.name || ''
    return catName.startsWith('Второе') || catName === 'Премиум второе'
  }

  const isGarnishDish = (dish: Dish) => {
    const catName = dish.category?.name || ''
    return catName.startsWith('Гарнир')
  }

  const garnishOptions = useMemo(() => dishes.filter(isGarnishDish), [dishes])
  const garnishById = useMemo(() => new Map(dishes.map(dish => [dish.id, dish] as const)), [dishes])

  const toggleDish = (dish: Dish) => {
    setSelectedDishes(prev => {
      if (prev[dish.id]) {
        const next = { ...prev }
        delete next[dish.id]
        return next
      }
      return { ...prev, [dish.id]: { dishId: dish.id, maxQuantity: 100, name: dish.name, garnishDishId: null } }
    })
  }

  const updateMaxQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedDishes(prev => ({ ...prev, [id]: { ...prev[id], maxQuantity: quantity } }))
  }

  const updateGarnish = (id: string, garnishDishId: string | null) => {
    setSelectedDishes(prev => ({ ...prev, [id]: { ...prev[id], garnishDishId } }))
  }

  const saveMenu = async () => {
    if (!date || !Object.keys(selectedDishes).length) {
      setMessage('❌ Выберите дату и хотя бы одно блюдо')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      await axios.post(`${API_URL}/daily-menu`, {
        date,
        items: Object.values(selectedDishes).map((item, index) => ({
          dishId: item.dishId,
          maxQuantity: item.maxQuantity,
          sortOrder: index,
          ...(item.garnishDishId ? { garnishDishId: item.garnishDishId } : {}),
        }))
      }, { headers: { Authorization: `Bearer ${token}` } })
      setMessage('✅ Меню на дату сохранено')
      setSelectedDishes({})
      setDate('')
      setGarnishPicker(null)
      // Reload menu for the range to reflect changes
      if (planningDates.length > 0) {
        loadMenusForRange(planningDates[0], planningDates[planningDates.length - 1])
      }
    } catch (e: any) {
      setMessage(`❌ Ошибка: ${e.response?.data?.message || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteMenuForDate = async () => {
    if (!activeDate) return
    if (!window.confirm(`Удалить меню на ${formatDateButton(activeDate)}?`)) return

    setDeletingMenu(true)
    setMessage('')
    try {
      await axios.delete(`${API_URL}/daily-menu/${activeDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('✅ Меню на дату удалено')
      setSelectedDishes({})
      // Reload
      if (planningDates.length > 0) {
        loadMenusForRange(planningDates[0], planningDates[planningDates.length - 1])
      }
    } catch (e: any) {
      setMessage(`❌ Ошибка: ${e.response?.data?.message || e.message}`)
    } finally {
      setDeletingMenu(false)
    }
  }

  const exportMenu = async () => {
    if (!exportStart || !exportEnd) {
      setMessage('❌ Укажите период для Excel-выгрузки')
      return
    }

    setExporting(true)
    setMessage('')
    try {
      const response = await axios.get(`${API_URL}/admin/daily-menu/export?start=${exportStart}&end=${exportEnd}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `daily-menu-${exportStart}-to-${exportEnd}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setMessage('✅ Excel с меню сформирован и скачан')
    } catch (e: any) {
      console.error(e)
      setMessage('❌ Не удалось выгрузить Excel с меню')
    } finally {
      setExporting(false)
    }
  }

  const previewImport = async () => {
    if (!importFile) {
      setMessage('❌ Сначала выбери Excel-файл')
      return
    }

    setPreviewLoading(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await axios.post(`${API_URL}/admin/daily-menu/import/preview`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      })

      setImportPreview(response.data)
      setMessage(response.data.errorRows > 0
        ? '⚠️ Файл разобран, но в нем есть ошибки'
        : '✅ Файл разобран, можно импортировать меню')
    } catch (e: any) {
      console.error(e)
      setMessage(`❌ ${e.response?.data?.message || 'Не удалось разобрать Excel-файл'}`)
    } finally {
      setPreviewLoading(false)
    }
  }

  const commitImport = async () => {
    if (!importPreview?.rows?.length) {
      setMessage('❌ Нет данных для импорта')
      return
    }

    if (importPreview.errorRows > 0) {
      setMessage('❌ Нельзя импортировать файл, пока в нем есть ошибки')
      return
    }

    setCommitLoading(true)
    setMessage('')
    try {
      const response = await axios.post(`${API_URL}/admin/daily-menu/import/commit`, {
        rows: importPreview.rows,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setImportPreview(null)
      setImportFile(null)
      setMessage(`✅ Импорт завершен. Обновлено дат: ${response.data.datesImported}`)
    } catch (e: any) {
      console.error(e)
      setMessage(`❌ ${e.response?.data?.message || 'Не удалось импортировать меню'}`)
    } finally {
      setCommitLoading(false)
    }
  }

  // Build grouped dishes and apply search filter
  const grouped = useMemo(() => {
    let filtered = dishes
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = dishes.filter(dish => dish.name.toLowerCase().includes(q))
    }
    const groups: Record<string, Dish[]> = {}
    filtered.forEach(dish => {
      const category = dish.category?.name || 'Без категории'
      if (!groups[category]) groups[category] = []
      groups[category].push(dish)
    })
    return groups
  }, [dishes, searchQuery])

  const hasMenuForDate = (d: string) => {
    return existingMenuForDate[d] && Object.keys(existingMenuForDate[d]).length > 0
  }

  // Determine if active date has a menu
  const activeHasMenu = activeDate ? hasMenuForDate(activeDate) : false

  return (
    <div>
      <h2>Планирование меню</h2>
      <p style={{ color: '#666', marginTop: -5, marginBottom: 15 }}>
        Можно планировать меню вручную на одну дату или сразу загрузить месяц из Excel.
      </p>

      {message && <div style={{ padding: 12, background: message.includes('❌') ? '#f8d7da' : message.includes('⚠️') ? '#fff3cd' : '#d4edda', marginBottom: 20, borderRadius: 6 }}>{message}</div>}

      {/* Week Calendar */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Недельное планирование</h3>
        <p style={{ color: '#666', marginTop: -5 }}>
          Выберите дату, чтобы начать редактировать меню.
        </p>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {planningDates.map(d => {
            const isActive = activeDate === d
            const hasMenu = hasMenuForDate(d)
            const isSelected = existingMenuForDate[d] && Object.keys(existingMenuForDate[d]).length > 0

            return (
              <button
                key={d}
                type="button"
                onClick={() => selectDate(d)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: isActive ? '2px solid #28a745' : '1px solid #ddd',
                  background: isActive ? '#d4edda' : '#fff',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 400,
                  position: 'relative'
                }}
              >
                <div style={{ fontWeight: 700 }}>{formatDateButton(d)}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  {new Date(d).toLocaleDateString('ru-RU', { weekday: 'long' })}
                </div>
                {hasMenu && (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#d4edda',
                    color: '#155724',
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    ✅ Есть меню
                  </span>
                )}
                {!hasMenu && (
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 8 }}>
                    Нет меню
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Manual planning */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Ручное планирование</h3>
        <div style={{ marginBottom: 12, color: '#666' }}>
          Для блюд из категорий <strong>«Второе без свинины»</strong> и <strong>«Второе свинина»</strong> можно сразу привязать гарнир.
        </div>
        <div style={{ marginBottom: 20, display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={date} onChange={(e) => {
            setDate(e.target.value)
            setActiveDate(e.target.value)
            // Load existing selections for this date if available
            const existing = existingMenuForDate[e.target.value]
            if (existing && Object.keys(existing).length > 0) {
              const sel: Record<string, SelectedDishDraft> = {}
              Object.entries(existing).forEach(([dishId, item]) => {
                sel[dishId] = {
                  dishId: item.dishId,
                  maxQuantity: item.maxQuantity,
                  name: item.name,
                  garnishDishId: item.garnishDishId
                }
              })
              setSelectedDishes(sel)
            } else {
              setSelectedDishes({})
            }
          }} />
          <button onClick={saveMenu} disabled={loading} style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px' }}>
            {loading ? 'Сохранение...' : 'Сохранить меню'}
          </button>
          {activeHasMenu && (
            <button onClick={deleteMenuForDate} disabled={deletingMenu} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px' }}>
              {deletingMenu ? 'Удаляю...' : '🗑 Удалить меню на дату'}
            </button>
          )}
        </div>

        {/* Search input */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="🔍 Поиск блюда по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: 400,
              padding: '10px 14px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {Object.keys(grouped).length === 0 && searchQuery.trim() ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#666', background: '#f8f9fa', borderRadius: 6 }}>
            Ничего не найдено по запросу «{searchQuery}»
          </div>
        ) : (
          sortCategoryEntries(Object.entries(grouped)).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#007bff' }}>{category}</h4>
              {items.map(dish => {
                const selected = selectedDishes[dish.id]
                const selectedGarnish = selected?.garnishDishId ? garnishById.get(selected.garnishDishId) : null
                const canLinkGarnish = isMainWithGarnishDish(dish)

                return (
                  <div key={dish.id} onClick={() => toggleDish(dish)} style={{ padding: 12, border: selected ? '2px solid #28a745' : '1px solid #ddd', background: selected ? '#d4edda' : 'white', marginBottom: 8, cursor: 'pointer', borderRadius: 6 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input type="checkbox" checked={!!selected} readOnly style={{ marginRight: 12 }} />
                      <div style={{ flex: 1 }}>{dish.name} - {dish.price} ₽</div>
                      {selected && (
                        <div onClick={(e) => e.stopPropagation()}>
                          Max:{' '}
                          <input type="number" min="1" value={selected.maxQuantity} onChange={(e) => updateMaxQuantity(dish.id, parseInt(e.target.value) || 1)} style={{ width: 70 }} />
                        </div>
                      )}
                    </div>

                    {selected && canLinkGarnish && (
                      <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, paddingLeft: 34, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: '#6f42c1', fontSize: 14 }}>
                          {selectedGarnish ? `Гарнир: ${selectedGarnish.name}` : 'Гарнир не привязан'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGarnishPicker({ dishId: dish.id, dishName: dish.name })}
                          style={{ background: '#eef5ff', color: '#0d6efd', border: '1px solid #bfd7ff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                        >
                          {selectedGarnish ? 'Изменить гарнир' : 'Связать гарнир'}
                        </button>
                        {selectedGarnish && (
                          <button
                            type="button"
                            onClick={() => updateGarnish(dish.id, null)}
                            style={{ background: '#fff', color: '#6c757d', border: '1px solid #ced4da', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
                          >
                            Убрать гарнир
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Selected dishes cart */}
      {Object.keys(selectedDishes).length > 0 && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginTop: 0 }}>Выбранные блюда 🛒 ({Object.keys(selectedDishes).length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.values(selectedDishes).map(item => (
              <div key={item.dishId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#f0fdf4', borderRadius: 8,
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#666' }}>Max: {item.maxQuantity}</span>
                  <button
                    onClick={() => {
                      setSelectedDishes(prev => {
                        const next = { ...prev }
                        delete next[item.dishId]
                        return next
                      })
                    }}
                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
            Выбрано блюд: {Object.keys(selectedDishes).length}
          </div>
        </div>
      )}

      {/* Excel blocks preserved as-is */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Excel-выгрузка меню</h3>
        <p style={{ color: '#666', marginTop: -5 }}>
          Можно скачать текущее планирование за период в Excel, поправить файл и потом загрузить его обратно.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
          <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
          <button onClick={exportMenu} disabled={exporting || !exportStart || !exportEnd} style={{ background: '#198754', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            {exporting ? 'Формирую Excel...' : 'Скачать Excel'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 25, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Импорт меню по датам из Excel</h3>
        <p style={{ color: '#666', marginTop: -5 }}>
          Нужные колонки: <strong>Дата</strong>, <strong>Категория</strong>, <strong>Блюдо</strong>. Дополнительно можно указать <strong>Макс. количество</strong> и <strong>Порядок</strong>.
          Одна строка = одно блюдо на одну дату. Также поддерживается формат Gastroprime: CSV/TSV файлы с колонками: Дата, Завтрак (основное блюдо), Суп со свининой и т.д.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportPreview(null) }} />
          <button onClick={previewImport} disabled={previewLoading || !importFile} style={{ background: '#0d6efd', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
            {previewLoading ? 'Разбираю файл...' : 'Показать preview'}
          </button>
          {importPreview && (
            <button onClick={commitImport} disabled={commitLoading || importPreview.errorRows > 0} style={{ background: '#28a745', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
              {commitLoading ? 'Импортирую...' : 'Подтвердить импорт'}
            </button>
          )}
        </div>

        {importPreview && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}><div style={{ color: '#666' }}>Строк всего</div><strong>{importPreview.totalRows}</strong></div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}><div style={{ color: '#666' }}>Дат</div><strong>{importPreview.dateCount}</strong></div>
              <div style={{ background: '#d4edda', padding: 12, borderRadius: 8 }}><div style={{ color: '#155724' }}>Новых дат</div><strong>{importPreview.createDateCount}</strong></div>
              <div style={{ background: '#cfe2ff', padding: 12, borderRadius: 8 }}><div style={{ color: '#084298' }}>Заменить дат</div><strong>{importPreview.replaceDateCount}</strong></div>
              <div style={{ background: '#f8d7da', padding: 12, borderRadius: 8 }}><div style={{ color: '#721c24' }}>Ошибки</div><strong>{importPreview.errorRows}</strong></div>
            </div>

            <div style={{ maxHeight: 420, overflow: 'auto', display: 'grid', gap: 12 }}>
              {importPreview.rows.map(row => (
                <div key={`${row.rowNumber}-${row.dishName}-${row.date}`} style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 14, background: row.errors.length ? '#fff5f5' : '#fcfcfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div>
                      <strong>Строка {row.rowNumber}: {row.date || 'Без даты'}</strong>
                      <div style={{ color: '#666' }}>{row.categoryName || 'Без категории'} • {row.dishName || 'Без блюда'}</div>
                    </div>
                    <div style={{ padding: '4px 10px', borderRadius: 999, background: row.dateAction === 'replace' ? '#cfe2ff' : '#d4edda', color: row.dateAction === 'replace' ? '#084298' : '#155724', fontWeight: 600 }}>
                      {row.dateAction === 'replace' ? 'Заменить меню даты' : 'Создать меню даты'}
                    </div>
                  </div>
                  <div style={{ color: '#666' }}>Лимит: {row.maxQuantity}, порядок: {row.sortOrder}</div>
                  {row.errors.length > 0 && (
                    <div style={{ marginTop: 10, padding: 10, background: '#f8d7da', borderRadius: 6, color: '#721c24' }}>
                      {row.errors.map(error => <div key={error}>• {error}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {garnishPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Выбор гарнира</h3>
              <button type="button" onClick={() => setGarnishPicker(null)} style={{ background: 'transparent', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ color: '#444', marginBottom: 12 }}>
              Для блюда <strong>{garnishPicker.dishName}</strong> выбери гарнир.
            </div>

            <div style={{ display: 'grid', gap: 8, maxHeight: 340, overflow: 'auto' }}>
              {garnishOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    updateGarnish(garnishPicker.dishId, option.id)
                    setGarnishPicker(null)
                  }}
                  style={{ textAlign: 'left', border: '1px solid #dbe4f0', borderRadius: 8, background: '#fff', padding: '10px 12px', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 600 }}>{option.name}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>{option.category?.name || 'Гарнир'}</div>
                </button>
              ))}
            </div>

            {garnishOptions.length === 0 && (
              <div style={{ color: '#856404', background: '#fff3cd', borderRadius: 8, padding: 12 }}>
                В справочнике пока нет блюд в гарнирных категориях.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
