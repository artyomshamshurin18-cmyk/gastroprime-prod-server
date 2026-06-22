import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL, MEDIA_URL } from './api-config';


const weeklyStatusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  CONFIRMED: 'В заявке',
  PAID: 'Оплачено',
  DEFERRED: 'Отсрочка',
  COMPLETED: 'Выполнено',
}

const attendanceLabels: Record<string, string> = {
  OFFICE: 'В офисе',
  REMOTE: 'Удаленно',
  VACATION: 'Отпуск',
  SICK: 'Больничный',
  NO_MEAL: 'Без питания',
}

const roleLabels: Record<string, string> = {
  CLIENT: 'Сотрудник',
  MASTER_CLIENT: 'Координатор компании',
}

const persistentUserStatusLabels: Record<string, string> = {
  ACTIVE: 'Активный',
  VACATION: 'В отпуске',
  DISMISSED: 'Уволен',
}

const companyStatusLabels: Record<string, string> = {
  ONBOARDING: 'В стадии подключения',
  ACTIVE: 'В работе',
  ON_HOLD: 'На стопе',
  TERMINATED: 'Доступ закрыт',
}

const mealModeLabels: Record<string, string> = {
  LUNCH: 'Обед',
  LUNCH_DINNER: 'Обед + ужин',
  BREAKFAST_LUNCH: 'Завтрак + обед',
  BREAKFAST_LUNCH_DINNER: 'Завтрак + обед + ужин',
}

const setTypeLabels: Record<string, string> = {
  FULL: 'Полный комплект',
  SOUP_SALAD: 'Суп + салат',
  MAIN_SALAD: 'Второе + салат',
  PREMIUM: 'Премиум',
}

const measureUnitLabels: Record<string, string> = {
  GRAM: 'г',
  ML: 'мл',
  PCS: 'порц.',
  PIECE: 'шт',
  PORTION: 'порц.',
}

const formatDishPortion = (dish: { weight?: number | null, measureUnit?: string }) => {
  if (!dish.weight) return ''
  const unit = measureUnitLabels[dish.measureUnit || 'GRAM'] || (dish.measureUnit || '').toLowerCase() || 'г'
  return `${dish.weight} ${unit}`
}

export default function ClientCompanyDashboard({ token, onUserUpdate }: { token: string, onUserUpdate?: (user: any) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savingUserId, setSavingUserId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('OFFICE')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [createForm, setCreateForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CLIENT' })
  const [creating, setCreating] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [defaultPassword, setDefaultPassword] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [companyDailyLimit, setCompanyDailyLimit] = useState('0')
  const [companyMealPlan, setCompanyMealPlan] = useState('LUNCH')
  const [companySetType, setCompanySetType] = useState('FULL')
  const [savingCompanyLimit, setSavingCompanyLimit] = useState(false)
  const [employeeDrafts, setEmployeeDrafts] = useState<Record<string, any>>({})
  const [savingPreferencesId, setSavingPreferencesId] = useState('')
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillReport, setAutoFillReport] = useState<any>(null)
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [createRequestReport, setCreateRequestReport] = useState<any>(null)
  const [editingEmployeeId, setEditingEmployeeId] = useState('')
  const [editorMenu, setEditorMenu] = useState<any>(null)
  const [editorLoading, setEditorLoading] = useState(false)
  const [manualDraft, setManualDraft] = useState<Record<string, number>>({})
  const [manualSaving, setManualSaving] = useState(false)
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false)

  const loadDashboard = async (targetDate = date) => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/users/company-dashboard?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(response.data)
      setCompanyDailyLimit(String(response.data.company?.dailyLimit ?? 0))
      setCompanyMealPlan(response.data.company?.mealPlan || 'LUNCH')
      setCompanySetType(response.data.company?.defaultSetType || 'FULL')
      setEmployeeDrafts(Object.fromEntries((response.data.employees || []).map((employee: any) => [employee.userId, {
        mealModeOverride: employee.mealModeOverride || '',
        setTypeOverride: employee.setTypeOverride || '',
        isHalal: Boolean(employee.isHalal),
        isVip: Boolean(employee.isVip),
        avoidGarlic: Boolean(employee.avoidGarlic),
        avoidMayonnaise: Boolean(employee.avoidMayonnaise),
      }])))
      setSelectedUserIds([])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить панель компании')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const updateAttendance = async (userId: string, status: string) => {
    setSavingUserId(userId)
    setError('')
    setMessage('')
    try {
      await axios.patch(`${API_URL}/users/company-dashboard/attendance`, {
        userId,
        date,
        status,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось сохранить статус')
    } finally {
      setSavingUserId('')
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  const toggleAllUsers = () => {
    if (!data?.employees?.length) return
    setSelectedUserIds(prev => prev.length === data.employees.length ? [] : data.employees.map((employee: any) => employee.userId))
  }

  const applyBulkStatus = async () => {
    if (selectedUserIds.length === 0) {
      setError('Сначала выбери сотрудников')
      return
    }

    setBulkSaving(true)
    setError('')
    setMessage('')
    try {
      await axios.patch(`${API_URL}/users/company-dashboard/attendance/bulk`, {
        userIds: selectedUserIds,
        date,
        status: bulkStatus,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось применить статус к выбранным сотрудникам')
    } finally {
      setBulkSaving(false)
    }
  }

  const createEmployee = async () => {
    if (!createForm.email || !createForm.password) {
      setError('Для добавления сотрудника нужны email и пароль')
      return
    }

    setCreating(true)
    setError('')
    setMessage('')
    try {
      await axios.post(`${API_URL}/users/company-dashboard/employees`, createForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CLIENT' })
      setMessage('✅ Сотрудник добавлен в компанию')
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось добавить сотрудника')
    } finally {
      setCreating(false)
    }
  }

  const previewImport = async () => {
    if (!importFile) {
      setError('Сначала выбери Excel-файл')
      return
    }

    setPreviewLoading(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('defaultPassword', defaultPassword)

      const response = await axios.post(`${API_URL}/users/company-dashboard/employees/import/preview`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      setImportPreview(response.data)
      setMessage(response.data.errorRows > 0 ? '⚠️ В файле есть ошибки' : '✅ Файл готов к импорту')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось разобрать Excel-файл')
    } finally {
      setPreviewLoading(false)
    }
  }

  const commitImport = async () => {
    if (!importPreview?.rows?.length) {
      setError('Нет данных для импорта')
      return
    }

    setCommitLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await axios.post(`${API_URL}/users/company-dashboard/employees/import/commit`, {
        rows: importPreview.rows,
        defaultPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setImportPreview(null)
      setImportFile(null)
      setDefaultPassword('')
      setMessage(`✅ Импорт завершен. Создано: ${response.data.created}, обновлено: ${response.data.updated}`)
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось импортировать сотрудников')
    } finally {
      setCommitLoading(false)
    }
  }

  const saveCompanyLimit = async () => {
    setSavingCompanyLimit(true)
    setError('')
    setMessage('')
    try {
      await axios.patch(`${API_URL}/users/company-dashboard/settings`, {
        dailyLimit: Number(companyDailyLimit) || 0,
        mealPlan: companyMealPlan,
        defaultSetType: companySetType,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMessage('✅ Дневной лимит компании обновлен')
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось обновить лимит')
    } finally {
      setSavingCompanyLimit(false)
    }
  }

  const updateEmployeeDraft = (userId: string, field: string, value: any) => {
    setEmployeeDrafts(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }))
  }

  const saveEmployeePreferences = async (userId: string) => {
    const draft = employeeDrafts[userId]
    if (!draft) return

    setSavingPreferencesId(userId)
    setError('')
    setMessage('')
    try {
      await axios.patch(`${API_URL}/users/company-dashboard/employees/${userId}/preferences`, draft, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMessage('✅ Настройки сотрудника обновлены')
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось сохранить настройки сотрудника')
    } finally {
      setSavingPreferencesId('')
    }
  }

  const autoFillMissing = async () => {
    setAutoFilling(true)
    setError('')
    setMessage('')
    setAutoFillReport(null)
    try {
      const response = await axios.post(`${API_URL}/users/company-dashboard/auto-fill`, {
        date,
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setAutoFillReport(response.data)
      setMessage(`✅ Автозаполнение завершено. Заполнено: ${response.data.updated}, пропущено: ${response.data.skipped}, ошибок: ${response.data.errors?.length || 0}`)
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось выполнить автозаполнение')
    } finally {
      setAutoFilling(false)
    }
  }

  const createRequest = async () => {
    setCreatingRequest(true)
    setError('')
    setMessage('')
    setCreateRequestReport(null)
    try {
      const response = await axios.post(`${API_URL}/users/company-dashboard/create-request`, {
        date,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setCreateRequestReport(response.data)
      setMessage(`✅ Заявка создана. Сотрудников: ${response.data.employeesCount}, порций: ${response.data.totalPortions}, сумма: ${response.data.totalAmount} ₽`)
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось создать заявку')
    } finally {
      setCreatingRequest(false)
    }
  }

  const openManualEditor = async (employee: any) => {
    setEditorLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/daily-menu/by-date?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setEditingEmployeeId(employee.userId)
      setEditorMenu(response.data)
      setManualDraft(Object.fromEntries((employee.items || []).map((item: any) => [item.dishId, item.quantity])))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить меню дня')
    } finally {
      setEditorLoading(false)
    }
  }

  const updateManualDraft = (dishId: string, value: string) => {
    setManualDraft(prev => ({
      ...prev,
      [dishId]: value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0),
    }))
  }

  const saveManualSelection = async (employeeId: string) => {
    setManualSaving(true)
    setError('')
    setMessage('')
    try {
      const items = Object.entries(manualDraft)
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([dishId, quantity]) => ({ dishId, quantity: Number(quantity) }))

      await axios.patch(`${API_URL}/users/company-dashboard/employees/${employeeId}/selection`, {
        date,
        items,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setMessage('✅ Выбор сотрудника сохранен')
      setEditingEmployeeId('')
      setEditorMenu(null)
      setManualDraft({})
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось сохранить выбор сотрудника')
    } finally {
      setManualSaving(false)
    }
  }

  const uploadCompanyLogo = async (file?: File | null) => {
    if (!file) return
    setUploadingCompanyLogo(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await axios.post(`${API_URL}/users/company-dashboard/logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      setData(response.data)
      setMessage('✅ Логотип компании обновлен')
      if (onUserUpdate) {
        const me = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        onUserUpdate(me.data)
      }
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить логотип компании')
    } finally {
      setUploadingCompanyLogo(false)
    }
  }

  const removeCompanyLogo = async () => {
    setUploadingCompanyLogo(true)
    setError('')
    setMessage('')
    try {
      const response = await axios.delete(`${API_URL}/users/company-dashboard/logo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(response.data)
      setMessage('✅ Логотип компании удален')
      if (onUserUpdate) {
        const me = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        onUserUpdate(me.data)
      }
      await loadDashboard(date)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось удалить логотип компании')
    } finally {
      setUploadingCompanyLogo(false)
    }
  }

  return (
    <div>
      <h2>Координатор компании</h2>
      <p style={{ color: '#666', marginTop: -5, marginBottom: 15 }}>
        Экран для быстрого контроля, кто уже выбрал питание на день, а кто еще нет.
      </p>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 84, height: 84, borderRadius: 16, overflow: 'hidden', background: '#f6f6f6', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {data?.company?.logoUrl ? <img src={MEDIA_URL(data.company.logoUrl)} alt="Логотип компании" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} /> : <span style={{ color: '#999', fontSize: 12 }}>Лого</span>}
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button onClick={() => loadDashboard()} disabled={loading} style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px' }}>
            {loading ? 'Загрузка...' : 'Показать'}
          </button>
          {data?.company && <strong style={{ flex: '1 1 220px' }}>{data.company.name}</strong>}
          {data?.company && <span style={{ color: '#6f42c1', fontWeight: 700, flex: '1 1 220px' }}>Статус: {companyStatusLabels[data.company.status] || data.company.status}</span>}
          <span style={{ color: '#17a2b8', flex: '1 1 180px' }}>Лимит/день: {data?.company?.dailyLimit ?? 0} ₽</span>
          <span style={{ color: "#28a745", flex: "1 1 180px" }}>Дебет: {data?.company?.balance ?? 0} ₽</span>
          <span style={{ color: "#fd7e14", flex: "1 1 180px" }}>Кредит: {data?.company?.creditBalance ?? 0} ₽</span>
        </div>
        <div style={{ marginTop: 12, maxWidth: 420 }}>
          <input type="file" accept="image/*" onChange={(e) => uploadCompanyLogo(e.target.files?.[0] || null)} />
          <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{uploadingCompanyLogo ? 'Загружаю логотип...' : data?.permissions?.canUseFullCompanyDashboard ? 'Координатор может загрузить логотип компании' : 'Изменение логотипа доступно только активной компании'}</div>
          {data?.company?.logoUrl && <button onClick={removeCompanyLogo} disabled={uploadingCompanyLogo || !data?.permissions?.canUseFullCompanyDashboard} style={{ marginTop: 8, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px' }}>Удалить логотип</button>}
        </div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 12 }}>
          <input type="number" min="0" placeholder="Лимит на день" value={companyDailyLimit} onChange={(e) => setCompanyDailyLimit(e.target.value)} disabled={!data?.permissions?.canUseFullCompanyDashboard} />
          <select value={companyMealPlan} onChange={(e) => setCompanyMealPlan(e.target.value)} disabled={!data?.permissions?.canUseFullCompanyDashboard}>
            {Object.entries(mealModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={companySetType} onChange={(e) => setCompanySetType(e.target.value)} disabled={!data?.permissions?.canUseFullCompanyDashboard}>
            {Object.entries(setTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={saveCompanyLimit} disabled={savingCompanyLimit || !data?.permissions?.canUseFullCompanyDashboard} style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
            {savingCompanyLimit ? 'Сохраняю...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#f8d7da', color: '#721c24', borderRadius: 6, marginBottom: 20 }}>{error}</div>}
      {message && <div style={{ padding: 12, background: '#d4edda', color: '#155724', borderRadius: 6, marginBottom: 20 }}>{message}</div>}
      {data && !data.permissions?.canUseFullCompanyDashboard && <div style={{ padding: 12, background: '#fff3cd', color: '#856404', borderRadius: 6, marginBottom: 20 }}>Для текущего статуса компании открыт ограниченный режим.</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ marginTop: 0 }}>Добавить сотрудника</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <input placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))} />
                <input placeholder="Пароль" value={createForm.password} onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))} />
                <input placeholder="Имя" value={createForm.firstName} onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))} />
                <input placeholder="Фамилия" value={createForm.lastName} onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))} />
                <input placeholder="Телефон" value={createForm.phone} onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))} />
                <select value={createForm.role} onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="CLIENT">{roleLabels.CLIENT}</option>
                  <option value="MASTER_CLIENT">{roleLabels.MASTER_CLIENT}</option>
                </select>
              </div>
              <button onClick={createEmployee} disabled={creating} style={{ marginTop: 15, background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
                {creating ? 'Создаю...' : 'Добавить сотрудника'}
              </button>
            </div>

            <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ marginTop: 0 }}>Импорт из Excel</h3>
              <p style={{ color: '#666', marginTop: -5 }}>Колонки: Email, Имя, Фамилия, Телефон, Роль, Пароль.</p>
              <div style={{ display: 'grid', gap: 10 }}>
                <input type="file" accept=".xlsx,.xls" onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportPreview(null) }} />
                <input placeholder="Пароль по умолчанию" value={defaultPassword} onChange={(e) => setDefaultPassword(e.target.value)} />
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <button onClick={previewImport} disabled={previewLoading || !importFile} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
                    {previewLoading ? 'Проверяю...' : 'Предпросмотр'}
                  </button>
                  {importPreview && <button onClick={commitImport} disabled={commitLoading || importPreview.errorRows > 0} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>{commitLoading ? 'Импортирую...' : 'Импортировать'}</button>}
                </div>
              </div>
              {importPreview && (
                <div style={{ marginTop: 15 }}>
                  <div style={{ color: '#666', fontSize: 14, marginBottom: 10 }}>
                    Строк: <strong>{importPreview.totalRows}</strong>, создать: <strong>{importPreview.createCount}</strong>, обновить: <strong>{importPreview.updateCount}</strong>, ошибок: <strong>{importPreview.errorRows}</strong>
                  </div>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflow: 'auto' }}>
                    {importPreview.rows.map((row: any) => (
                      <div key={`${row.rowNumber}-${row.email}`} style={{ border: '1px solid #e9ecef', borderRadius: 6, padding: 8, background: row.errors.length ? '#fff5f5' : '#f8f9fa', fontSize: 13 }}>
                        <strong>{row.email || `Строка ${row.rowNumber}`}</strong> · {roleLabels[row.role] || row.role} · {row.action === 'create' ? 'создать' : 'обновить'}
                        {row.errors.length > 0 && <div style={{ color: '#b02a37', marginTop: 4 }}>{row.errors.join(' • ')}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {data.permissions?.canUseFullCompanyDashboard && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Сотрудников</div><strong>{data.summary.employeesCount}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Выбрали</div><strong style={{ color: '#28a745' }}>{data.summary.selectedCount}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>В черновике</div><strong style={{ color: data.summary.draftCount ? '#fd7e14' : '#6c757d' }}>{data.summary.draftCount}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>В заявке</div><strong style={{ color: '#0d6efd' }}>{data.summary.confirmedCount}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Без выбора</div><strong style={{ color: '#dc3545' }}>{data.summary.missingCount}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Не в офисе / без питания</div><strong>{data.summary.nonOfficeCount}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Порций</div><strong>{data.summary.totalPortions}</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Сумма</div><strong>{data.summary.totalAmount} ₽</strong></div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}><div style={{ color: '#666' }}>Выше лимита</div><strong style={{ color: data.summary.overLimitCount ? '#fd7e14' : '#28a745' }}>{data.summary.overLimitCount}</strong></div>
          </div>}

          {data.permissions?.canUseFullCompanyDashboard && <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'center' }}>
            <button onClick={toggleAllUsers} style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
              {selectedUserIds.length === data.employees.length && data.employees.length > 0 ? 'Снять выделение' : 'Выбрать всех'}
            </button>
            <span style={{ alignSelf: 'center' }}>Выбрано: <strong>{selectedUserIds.length}</strong></span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
              {Object.entries(attendanceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button onClick={applyBulkStatus} disabled={bulkSaving || selectedUserIds.length === 0} style={{ background: '#212529', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
              {bulkSaving ? 'Сохраняю...' : 'Применить выбранным'}
            </button>
            <button onClick={autoFillMissing} disabled={autoFilling} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
              {autoFilling ? 'Заполняю...' : selectedUserIds.length > 0 ? 'Автозаполнить выбранных' : 'Автозаполнить невыбравших'}
            </button>
            <button onClick={createRequest} disabled={creatingRequest || data.summary.selectedCount === 0} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
              {creatingRequest ? 'Собираю заявку...' : 'Создать заявку'}
            </button>
          </div>}

          {data.permissions?.canUseFullCompanyDashboard && createRequestReport && (
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ marginTop: 0 }}>Заявка создана</h3>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 14 }}>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}><div style={{ color: '#666' }}>Сотрудников</div><strong>{createRequestReport.employeesCount}</strong></div>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}><div style={{ color: '#666' }}>Подтверждено</div><strong>{createRequestReport.confirmedMenus}</strong></div>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}><div style={{ color: '#666' }}>Уже были в заявке</div><strong>{createRequestReport.alreadyConfirmedMenus}</strong></div>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}><div style={{ color: '#666' }}>Порций</div><strong>{createRequestReport.totalPortions}</strong></div>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12 }}><div style={{ color: '#666' }}>Сумма</div><strong>{createRequestReport.totalAmount} ₽</strong></div>
              </div>
              {createRequestReport.employees?.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {createRequestReport.employees.map((entry: any) => (
                    <div key={entry.userId} style={{ background: '#f7faff', border: '1px solid #d7e7ff', borderRadius: 6, padding: 10 }}>
                      <strong>{entry.userName}</strong>
                      <div style={{ color: '#444', marginTop: 4 }}>{entry.items.map((item: any) => `${item.dishName} × ${item.quantity}`).join(' • ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {data.permissions?.canUseFullCompanyDashboard && autoFillReport && (
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ marginTop: 0 }}>Отчет по автозаполнению</h3>

              {autoFillReport.updatedEmployees?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: '#198754' }}>Заполнено</strong>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {autoFillReport.updatedEmployees.map((entry: any) => (
                      <div key={entry.userId} style={{ background: '#f8fff9', border: '1px solid #d1e7dd', borderRadius: 6, padding: 10 }}>
                        <strong>{entry.userName}</strong>
                        <div style={{ color: '#444', marginTop: 4 }}>{entry.items.join(' • ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoFillReport.skippedEmployees?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ color: '#6c757d' }}>Пропущено</strong>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {autoFillReport.skippedEmployees.map((entry: any) => (
                      <div key={entry.userId} style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 6, padding: 10 }}>
                        <strong>{entry.userName}</strong>
                        <div style={{ color: '#666', marginTop: 4 }}>{entry.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {autoFillReport.errors?.length > 0 && (
                <div>
                  <strong style={{ color: '#dc3545' }}>Ошибки</strong>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {autoFillReport.errors.map((entry: any) => (
                      <div key={entry.userId} style={{ background: '#fff5f5', border: '1px solid #f5c2c7', borderRadius: 6, padding: 10 }}>
                        <strong>{entry.userName}</strong>
                        <div style={{ color: '#842029', marginTop: 4 }}>{entry.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.permissions?.canUseFullCompanyDashboard && data.summary.selectedCount > 0 && (
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>Состав заявки на {date}</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {data.employees.filter((employee: any) => employee.hasSelection).map((employee: any) => (
                  <div key={`request-${employee.userId}`} style={{ background: employee.weeklyStatus === 'CONFIRMED' || employee.weeklyStatus === 'PAID' || employee.weeklyStatus === 'DEFERRED' ? '#f7faff' : '#fff8e6', border: employee.weeklyStatus === 'CONFIRMED' || employee.weeklyStatus === 'PAID' || employee.weeklyStatus === 'DEFERRED' ? '1px solid #d7e7ff' : '1px solid #ffe69c', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong>{employee.userName}</strong>
                      <span style={{ fontSize: 13, color: employee.weeklyStatus === 'DRAFT' ? '#fd7e14' : employee.weeklyStatus === 'CONFIRMED' ? '#0d6efd' : employee.weeklyStatus === 'PAID' ? '#28a745' : employee.weeklyStatus === 'DEFERRED' ? '#fd7e14' : employee.weeklyStatus === 'COMPLETED' ? '#17a2b8' : '#fd7e14', fontWeight: 700 }}>
                        {employee.weeklyStatus === 'DRAFT' ? 'Черновик' : employee.weeklyStatus === 'CONFIRMED' ? 'В заявке' : employee.weeklyStatus === 'PAID' ? 'Оплачено' : employee.weeklyStatus === 'DEFERRED' ? 'Отсрочка' : employee.weeklyStatus === 'COMPLETED' ? 'Выполнено' : 'Черновик'}
                      </span>
                    </div>
                    <div style={{ color: '#444', marginTop: 6 }}>{(employee.items || []).map((item: any) => `${item.dishName} × ${item.quantity}`).join(' • ')}</div>
                    <div style={{ color: '#666', marginTop: 6, fontSize: 14 }}>Порций: {employee.totalPortions} • Сумма: {employee.totalAmount} ₽</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {data.employees.map((employee: any) => (
              <div key={employee.userId} style={{ background: '#fff', borderRadius: 8, padding: 16, border: employee.hasSelection ? '1px solid #d4edda' : '1px solid #f5c6cb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#f8f9fa', padding: '6px 10px', borderRadius: 999 }}>
                      <input type="checkbox" checked={selectedUserIds.includes(employee.userId)} onChange={() => toggleUser(employee.userId)} />
                      <span style={{ color: '#666', fontSize: 14 }}>выбрать</span>
                    </label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: '#f3f3f3', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {employee.avatarUrl ? <img src={MEDIA_URL(employee.avatarUrl)} alt={employee.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#999', fontSize: 11 }}>Фото</span>}
                      </div>
                      <div>
                        <strong>{employee.userName}</strong>
                        <div style={{ color: '#666', fontSize: 14 }}>{employee.email}</div>
                        {employee.phone && <div style={{ color: '#666', fontSize: 14 }}>{employee.phone}</div>}
                        <div style={{ color: '#6f42c1', fontSize: 14 }}>{persistentUserStatusLabels[employee.status] || employee.status}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <select value={employee.attendanceStatus || 'OFFICE'} onChange={(e) => updateAttendance(employee.userId, e.target.value)} disabled={savingUserId === employee.userId || !data.permissions?.canUseFullCompanyDashboard}>
                        {Object.entries(attendanceLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: employee.hasSelection ? '#28a745' : '#dc3545' }}>
                      {employee.hasSelection ? 'Выбор есть' : 'Нет выбора'}
                    </div>
                    <div style={{ color: '#666', fontSize: 14 }}>{attendanceLabels[employee.attendanceStatus] || employee.attendanceStatus}</div>
                    {employee.weeklyStatus && <div style={{ color: '#666', fontSize: 14 }}>{weeklyStatusLabels[employee.weeklyStatus] || employee.weeklyStatus}</div>}
                    {employee.hasSelection && <div style={{ color: employee.overLimit ? '#fd7e14' : '#333', fontWeight: 700 }}>{employee.totalAmount} ₽</div>}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                  <select value={employeeDrafts[employee.userId]?.mealModeOverride || ''} onChange={(e) => updateEmployeeDraft(employee.userId, 'mealModeOverride', e.target.value)} disabled={!data.permissions?.canUseFullCompanyDashboard}>
                    <option value="">Режим по компании</option>
                    {Object.entries(mealModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select value={employeeDrafts[employee.userId]?.setTypeOverride || ''} onChange={(e) => updateEmployeeDraft(employee.userId, 'setTypeOverride', e.target.value)} disabled={!data.permissions?.canUseFullCompanyDashboard}>
                    <option value="">Комплект по компании</option>
                    {Object.entries(setTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: '10px 12px' }}>
                    <input type="checkbox" checked={Boolean(employeeDrafts[employee.userId]?.isHalal)} onChange={(e) => updateEmployeeDraft(employee.userId, 'isHalal', e.target.checked)} disabled={!data.permissions?.canUseFullCompanyDashboard} />
                    Халяль
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: '10px 12px' }}>
                    <input type="checkbox" checked={Boolean(employeeDrafts[employee.userId]?.isVip)} onChange={(e) => updateEmployeeDraft(employee.userId, 'isVip', e.target.checked)} disabled={!data.permissions?.canUseFullCompanyDashboard} />
                    VIP / премиум
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: '10px 12px' }}>
                    <input type="checkbox" checked={Boolean(employeeDrafts[employee.userId]?.avoidGarlic)} onChange={(e) => updateEmployeeDraft(employee.userId, 'avoidGarlic', e.target.checked)} disabled={!data.permissions?.canUseFullCompanyDashboard} />
                    Без чеснока
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: '10px 12px' }}>
                    <input type="checkbox" checked={Boolean(employeeDrafts[employee.userId]?.avoidMayonnaise)} onChange={(e) => updateEmployeeDraft(employee.userId, 'avoidMayonnaise', e.target.checked)} disabled={!data.permissions?.canUseFullCompanyDashboard} />
                    Без майонеза
                  </label>
                  <button onClick={() => saveEmployeePreferences(employee.userId)} disabled={savingPreferencesId === employee.userId || !data.permissions?.canUseFullCompanyDashboard} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
                    {savingPreferencesId === employee.userId ? 'Сохраняю...' : 'Сохранить профиль'}
                  </button>
                  <button onClick={() => editingEmployeeId === employee.userId ? setEditingEmployeeId('') : openManualEditor(employee)} disabled={!data.permissions?.canUseFullCompanyDashboard || (editorLoading && editingEmployeeId !== employee.userId)} style={{ background: '#6f42c1', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
                    {editingEmployeeId === employee.userId ? 'Скрыть выбор' : 'Выбрать вручную'}
                  </button>
                </div>

                {editingEmployeeId === employee.userId && (
                  <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: '#f8f9ff', border: '1px solid #d9d7ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                      <strong>Ручной выбор на {date}</strong>
                      {editorLoading && <span style={{ color: '#666' }}>Загружаю меню дня...</span>}
                    </div>

                    {!editorLoading && editorMenu && Object.keys(editorMenu.items || {}).length === 0 && (
                      <div style={{ color: '#666' }}>На эту дату меню еще не загружено.</div>
                    )}

                    {!editorLoading && editorMenu && Object.entries(editorMenu.items || {}).map(([categoryName, dishes]: [string, any]) => (
                      <div key={categoryName} style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{categoryName}</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {dishes.map((dish: any) => (
                            <div key={dish.dishId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 10, alignItems: 'center', background: '#fff', borderRadius: 6, padding: 10, border: '1px solid #ececff' }}>
                              <div style={{ minWidth: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#f6f6f6', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                                  {dish.photoUrl ? <img src={MEDIA_URL(dish.photoUrl)} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }} /> : <span style={{ color: '#aaa', fontSize: 11 }}>Фото</span>}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600 }}>{dish.name}</div>
                                  {dish.weight && <div style={{ color: '#666', fontSize: 13 }}>{formatDishPortion(dish)}</div>}
                                </div>
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={manualDraft[dish.dishId] ?? 0}
                                onChange={(e) => updateManualDraft(dish.dishId, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button onClick={() => saveManualSelection(employee.userId)} disabled={manualSaving || editorLoading} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 14px', width: '100%' }}>
                      {manualSaving ? 'Сохраняю выбор...' : 'Сохранить выбор сотрудника'}
                    </button>
                  </div>
                )}

                {employee.attendanceStatus !== 'OFFICE' && !employee.hasSelection ? (
                  <div style={{ marginTop: 10, color: '#666' }}>На этот день сотрудник отмечен как: {attendanceLabels[employee.attendanceStatus] || employee.attendanceStatus}</div>
                ) : employee.hasSelection ? (
                  <>
                    <div style={{ marginTop: 10, color: '#333' }}>
                      {employee.items.map((item: any) => `${item.dishName} × ${item.quantity}`).join(' • ')}
                    </div>
                    <div style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
                      Порций: {employee.totalPortions}, приборов: {employee.utensils}, хлеб: {employee.needBread ? 'да' : 'нет'}
                    </div>
                    {employee.notes && <div style={{ marginTop: 8, color: '#8a6d3b', fontSize: 14 }}>Примечание: {employee.notes}</div>}
                    {employee.overLimit && <div style={{ marginTop: 8, color: '#fd7e14', fontSize: 14 }}>Превышен лимит на день</div>}
                  </>
                ) : (
                  <div style={{ marginTop: 10, color: '#dc3545' }}>Сотрудник еще не заполнил меню на этот день</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
