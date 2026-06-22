import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from './api-config';


const mealPlanOptions = [
  'Обед',
  'Завтрак + обед',
  'Завтрак + обед + ужин',
  'Обед + ужин',
  'Смешанный рацион',
]

const priceSegmentOptions = [
  { value: 'STANDARD', label: 'Стандарт' },
  { value: 'MEDIUM', label: 'Медиум' },
  { value: 'PRIME', label: 'Прайм' },
]

const roleLabels: Record<string, string> = {
  CLIENT: 'Сотрудник',
  MASTER_CLIENT: 'Координатор',
}
const roleColors: Record<string, string> = {
  CLIENT: '#6c757d',
  MASTER_CLIENT: '#007bff',
}
const companyStatusColors: Record<string, string> = {
  ACTIVE: '#28a745',
  ONBOARDING: '#ffc107',
  CRM_LEAD: '#17a2b8',
  ARCHIVED: '#6c757d',
  BLOCKED: '#dc3545',
};
const companyStatusLabels: Record<string, string> = {
  ONBOARDING: 'В стадии подключения',
  ACTIVE: 'В работе',
  ON_HOLD: 'На стопе',
  TERMINATED: 'Договор расторгнут',
}

interface Company {
  id: string
  name: string
  status?: string
  contactPerson?: string
  address?: string
  billingAddress?: string
  billingDetails?: string
  entryConditions?: string
  routeName?: string
  accountNumber?: string
  deliveryTime?: string
  peopleCount?: string
  notes?: string
  mealPlan?: string
  workEmail?: string
  website?: string
  priceSegment?: string
  balance?: number
  limit?: number
  dailyLimit?: number
  categoryPrices?: Array<{
    categoryId: string
    categoryName: string
    price: number
  }>
  _count?: {
    users: number
    orders: number
  }
}

interface CompanyUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
  phone: string | null
  role: string
  status: string
  createdAt: string
}

interface CategoryOption {
  id: string
  name: string
}

interface CompanyDraft {
  name: string
  status: string
  contactPerson: string
  address: string
  billingAddress: string
  billingDetails: string
  entryConditions: string
  routeName: string
  deliveryTime: string
  peopleCount: string
  notes: string
  mealPlan: string
  workEmail: string
  website: string
  priceSegment: string
  balance: number
  limit: number
  dailyLimit: number
  categoryPrices: Record<string, string>
}

const emptyCompanyForm: CompanyDraft = {
  name: '',
  status: 'ONBOARDING',
  contactPerson: '',
  address: '',
  billingAddress: '',
  billingDetails: '',
  entryConditions: '',
  routeName: '',
  deliveryTime: '',
  peopleCount: '',
  notes: '',
  mealPlan: 'Обед',
  workEmail: '',
  website: '',
  priceSegment: 'STANDARD',
  balance: 0,
  limit: 50000,
  dailyLimit: 0,
  categoryPrices: {},
}

interface BillingSettingsDraft {
  sellerName: string
  sellerAddress: string
  sellerDetails: string
}

const emptyBillingSettings: BillingSettingsDraft = {
  sellerName: '',
  sellerAddress: '',
  sellerDetails: '',
}

const toCategoryPriceDraft = (items?: Array<{ categoryId: string, price: number }>) => Object.fromEntries((items || []).map((item) => [item.categoryId, String(item.price)]))
const serializeCategoryPrices = (value: Record<string, string>) => Object.entries(value)
  .map(([categoryId, price]) => ({ categoryId, price: Number(price) }))
  .filter((item) => item.categoryId && Number.isFinite(item.price) && item.price > 0)

export default function AdminCompanies({ token }: { token: string }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [drafts, setDrafts] = useState<Record<string, CompanyDraft>>({})
  const [createForm, setCreateForm] = useState<CompanyDraft>(emptyCompanyForm)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettingsDraft>(emptyBillingSettings)
  const [savingBillingSettings, setSavingBillingSettings] = useState(false)
  const [companyUsers, setCompanyUsers] = useState<Record<string, CompanyUser[]>>({})
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({})
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const [companiesResponse, billingResponse, categoriesResponse] = await Promise.all([
        axios.get(`${API_URL}/admin/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/billing-settings`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const response = companiesResponse
      setBillingSettings({
        sellerName: billingResponse.data?.sellerName || '',
        sellerAddress: billingResponse.data?.sellerAddress || '',
        sellerDetails: billingResponse.data?.sellerDetails || '',
      })
      setCategories(categoriesResponse.data || [])

      setCompanies(response.data)
      setDrafts(Object.fromEntries(response.data.map((company: Company) => [
        company.id,
        {
          name: company.name || '',
          status: company.status || 'ONBOARDING',
          contactPerson: company.contactPerson || '',
          address: company.address || '',
          billingAddress: company.billingAddress || '',
          billingDetails: company.billingDetails || '',
          entryConditions: company.entryConditions || '',
          routeName: company.routeName || '',
          deliveryTime: company.deliveryTime || '',
          peopleCount: company.peopleCount || '',
          notes: company.notes || '',
          mealPlan: company.mealPlan || 'Обед',
          workEmail: company.workEmail || '',
          website: company.website || '',
          priceSegment: company.priceSegment || 'STANDARD',
          balance: company.balance || 0,
          limit: company.limit || 50000,
          dailyLimit: company.dailyLimit || 0,
          categoryPrices: toCategoryPriceDraft(company.categoryPrices),
        }
      ])))
    } catch (err) {
      console.error(err)
      setMessage('❌ Не удалось загрузить компании')
    } finally {
      setLoading(false)
    }
  }

  const saveBillingSettings = async () => {
    setSavingBillingSettings(true)
    setMessage('')
    try {
      await axios.patch(`${API_URL}/admin/billing-settings`, billingSettings, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('✅ Наши реквизиты сохранены')
      await loadCompanies()
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось сохранить реквизиты'}`)
    } finally {
      setSavingBillingSettings(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const createCompany = async () => {
    if (!createForm.name.trim()) {
      setMessage('❌ Укажи название компании')
      return
    }

    setCreating(true)
    setMessage('')
    try {
      await axios.post(`${API_URL}/admin/companies`, {
        ...createForm,
        categoryPrices: serializeCategoryPrices(createForm.categoryPrices),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCreateForm(emptyCompanyForm)
      setMessage('✅ Компания создана')
      await loadCompanies()
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось создать компанию'}`)
    } finally {
      setCreating(false)
    }
  }

  const saveCompany = async (companyId: string) => {
    const draft = drafts[companyId]
    if (!draft?.name.trim()) {
      setMessage('❌ Название компании не может быть пустым')
      return
    }

    setSavingId(companyId)
    setMessage('')
    try {
      await axios.patch(`${API_URL}/admin/companies/${companyId}`, {
        ...draft,
        categoryPrices: serializeCategoryPrices(draft.categoryPrices),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('✅ Компания обновлена')
      await loadCompanies()
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось обновить компанию'}`)
    } finally {
      setSavingId(null)
    }
  }

  const updateDraft = (companyId: string, field: keyof CompanyDraft, value: string | number) => {
    setDrafts(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value,
      }
    }))
  }

  const loadCompanyUsers = async (companyId: string) => {
    setLoadingUsers(prev => ({ ...prev, [companyId]: true }))
    try {
      const res = await axios.get(`${API_URL}/admin/companies/${companyId}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCompanyUsers(prev => ({ ...prev, [companyId]: res.data }))
    } catch (err) {
      console.error(err)
      setMessage('❌ Не удалось загрузить сотрудников')
    } finally {
      setLoadingUsers(prev => ({ ...prev, [companyId]: false }))
    }
  }

  const changeUserRole = async (userId: string, companyId: string, newRole: string) => {
    setUpdatingRole(userId)
    try {
      await axios.patch(`${API_URL}/admin/companies/${companyId}/users/${userId}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('✅ Роль обновлена')
      await loadCompanyUsers(companyId)
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось изменить роль'}`)
    } finally {
      setUpdatingRole(null)
    }
  }

  const updateCategoryPrice = (form: CompanyDraft, categoryId: string, value: string, apply: (next: CompanyDraft) => void) => {
    apply({
      ...form,
      categoryPrices: {
        ...form.categoryPrices,
        [categoryId]: value,
      },
    })
  }

  const deleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Удалить компанию ${companyName}? Это удалит пользователей, заказы и связанные данные компании.`)) return

    setDeletingId(companyId)
    setMessage('')
    try {
      await axios.delete(`${API_URL}/admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('✅ Компания удалена')
      await loadCompanies()
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось удалить компанию'}`)
    } finally {
      setDeletingId(null)
    }
  }

  const renderFields = (form: CompanyDraft, onChange: (field: keyof CompanyDraft, value: string | number) => void, onCategoryPriceChange: (categoryId: string, value: string) => void) => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <input placeholder="Название компании" value={form.name} onChange={(e) => onChange('name', e.target.value)} />
        <select value={form.status} onChange={(e) => onChange('status', e.target.value)}>
          {Object.entries(companyStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input placeholder="Контактное лицо" value={form.contactPerson} onChange={(e) => onChange('contactPerson', e.target.value)} />
        <input placeholder="Адрес компании" value={form.address} onChange={(e) => onChange('address', e.target.value)} />
        <input placeholder="Юридический адрес для счета" value={form.billingAddress} onChange={(e) => onChange('billingAddress', e.target.value)} />
        <input placeholder="Телефон" value={form.entryConditions} onChange={(e) => onChange('entryConditions', e.target.value)} />
        <input placeholder="Рейс / маршрут" value={form.routeName} onChange={(e) => onChange('routeName', e.target.value)} />
        <input placeholder="Окно доставки, например 10:00-12:00" value={form.deliveryTime} onChange={(e) => onChange('deliveryTime', e.target.value)} />
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 14, color: '#4b3a30', fontWeight: 600 }}>Количество питающихся</span>
          <input type="text" value={form.peopleCount} onChange={(e) => onChange('peopleCount', e.target.value)} />
        </label>
        <input placeholder="Особые отметки" value={form.notes} onChange={(e) => onChange('notes', e.target.value)} />
        <select value={form.mealPlan} onChange={(e) => onChange('mealPlan', e.target.value)}>
          {mealPlanOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <input placeholder="Рабочий email" value={form.workEmail} onChange={(e) => onChange('workEmail', e.target.value)} />
        <input placeholder="Сайт компании" value={form.website} onChange={(e) => onChange('website', e.target.value)} />
        <select value={form.priceSegment} onChange={(e) => onChange('priceSegment', e.target.value)}>
          {priceSegmentOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 14, color: '#4b3a30', fontWeight: 600 }}>Баланс, руб</span>
          <input type="number" min={0} value={form.balance} onChange={(e) => onChange('balance', parseInt(e.target.value) || 0)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 14, color: '#4b3a30', fontWeight: 600 }}>Общий лимит, руб</span>
          <input type="number" min={0} value={form.limit} onChange={(e) => onChange('limit', parseInt(e.target.value) || 0)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 14, color: '#4b3a30', fontWeight: 600 }}>Дневной лимит, руб</span>
          <input type="number" min={0} value={form.dailyLimit} onChange={(e) => onChange('dailyLimit', parseInt(e.target.value) || 0)} />
        </label>
      </div>
      <textarea placeholder="Реквизиты компании для счета" value={form.billingDetails} onChange={(e) => onChange('billingDetails', e.target.value)} rows={4} style={{ width: '100%', marginTop: 12 }} />
      {categories.length > 0 && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#fff7f1', border: '1px solid #f1d5c3' }}>
          <strong>Цены по категориям для этого клиента</strong>
          <div style={{ color: '#6f6a64', marginTop: 6, marginBottom: 10 }}>Если поле пустое, останется базовая цена блюда. Если цена задана, она становится верховой для всей категории у этого клиента.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {categories.map((category) => (
              <label key={category.id} style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#4b3a30' }}>{category.name}</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Базовая цена"
                  value={form.categoryPrices[category.id] || ''}
                  onChange={(e) => onCategoryPriceChange(category.id, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  )

  return (
    <div>
      <h2 className="gp-page-title">Компании</h2>
      <p className="gp-page-lead">
        Здесь заводятся компании, к которым потом привязываются пользователи. В карточке компании хранится вся бизнес-информация и лимиты.
      </p>

      {message && <div style={{ padding: 12, background: message.includes('❌') ? '#f8d7da' : '#d4edda', marginBottom: 20, borderRadius: 6 }}>{message}</div>}

      <div className="gp-surface-card" style={{ padding: 20, marginBottom: 25 }}>
        <h3 style={{ marginTop: 0 }}>Наши реквизиты для счета</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <input placeholder="Название нашей компании" value={billingSettings.sellerName} onChange={(e) => setBillingSettings(prev => ({ ...prev, sellerName: e.target.value }))} />
          <input placeholder="Наш юридический адрес" value={billingSettings.sellerAddress} onChange={(e) => setBillingSettings(prev => ({ ...prev, sellerAddress: e.target.value }))} />
          <textarea placeholder="Полный блок наших реквизитов" value={billingSettings.sellerDetails} onChange={(e) => setBillingSettings(prev => ({ ...prev, sellerDetails: e.target.value }))} rows={5} />
        </div>
        <button onClick={saveBillingSettings} disabled={savingBillingSettings} style={{ marginTop: 15, background: '#6f42c1', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
          {savingBillingSettings ? 'Сохраняю...' : 'Сохранить наши реквизиты'}
        </button>
      </div>

      <div className="gp-surface-card" style={{ padding: 20, marginBottom: 25 }}>
        <h3 style={{ marginTop: 0 }}>Добавить компанию</h3>
        {renderFields(
          createForm,
          (field, value) => setCreateForm(prev => ({ ...prev, [field]: value })),
          (categoryId, value) => updateCategoryPrice(createForm, categoryId, value, setCreateForm),
        )}
        <button onClick={createCompany} disabled={creating} style={{ marginTop: 15, background: '#28a745', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
          {creating ? 'Создание...' : 'Создать компанию'}
        </button>
      </div>

      {loading ? (
        <p>Загрузка компаний...</p>
      ) : companies.length === 0 ? (
        <p>Компаний пока нет</p>
      ) : (
        companies.map(company => {
          const draft = drafts[company.id]
          const isExpanded = expandedId === company.id;
          const color = companyStatusColors[draft.status] || '#888';
          const label = companyStatusLabels[draft.status] || draft.status;
          return (
            <div key={company.id} className="gp-surface-card" style={{ marginBottom: 8, overflow: 'hidden' }}>
              <div
                onClick={() => {
                  if (!isExpanded && !companyUsers[company.id]) {
                    loadCompanyUsers(company.id)
                  }
                  setExpandedId(isExpanded ? null : company.id)
                }}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  userSelect: 'none',
                  background: isExpanded ? '#fafafa' : '#fff',
                  borderBottom: isExpanded ? '1px solid #eee' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 15 }}>{company.name}</strong>
                  {company.accountNumber && <span style={{ fontSize: 12, color: '#999', fontFamily: 'monospace' }}>{company.accountNumber}</span>}
                  <span style={{ fontSize: 12, color, fontWeight: 600 }}>{'\u25cf'} {label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#999', flexShrink: 0 }}>
                  <span>{company._count?.users || 0} чел.</span>
                  <span style={{ fontSize: 11 }}>{isExpanded ? '\u25b2' : '\u25bc'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px 20px' }}>
                  {renderFields(
                    draft,
                    (field, value) => updateDraft(company.id, field, value),
                    (categoryId, value) => updateCategoryPrice(draft, categoryId, value, (next) => setDrafts(prev => ({ ...prev, [company.id]: next }))),
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 15, flexWrap: 'wrap' }}>
                    <button onClick={() => saveCompany(company.id)} disabled={savingId === company.id} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
                      {savingId === company.id ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    <button onClick={() => deleteCompany(company.id, company.name)} disabled={deletingId === company.id} style={{ background: '#dc3545', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px' }}>
                      {deletingId === company.id ? 'Удаляю...' : 'Удалить компанию'}
                    </button>
                  </div>

                  <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Сотрудники ({company._count?.users || 0})</h4>
                    {loadingUsers[company.id] ? (
                      <p style={{ fontSize: 13, color: '#999' }}>Загрузка...</p>
                    ) : companyUsers[company.id]?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {companyUsers[company.id].map((u) => (
                          <div key={u.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', background: '#f9f9f9', borderRadius: 8, fontSize: 13
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong>{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</strong>
                              {u.jobTitle && <span style={{ color: '#888', marginLeft: 8 }}>{u.jobTitle}</span>}
                              <div style={{ color: '#aaa', fontSize: 12 }}>{u.email}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <select
                                value={u.role}
                                onChange={(e) => changeUserRole(u.id, company.id, e.target.value)}
                                disabled={updatingRole === u.id}
                                style={{
                                  fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd',
                                  background: '#fff', cursor: 'pointer'
                                }}
                              >
                                {Object.entries(roleLabels).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                background: (roleColors[u.role] || '#888') + '18',
                                color: roleColors[u.role] || '#888',
                                fontWeight: 600
                              }}>
                                {updatingRole === u.id ? '...' : roleLabels[u.role] || u.role}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: '#aaa' }}>Нет сотрудников</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
