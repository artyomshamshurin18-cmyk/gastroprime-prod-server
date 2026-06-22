import { useEffect, useMemo, useState, type ReactNode } from 'react'
import axios from 'axios'
import { API_URL } from './api-config';


const cardStyle = {
  background: '#fff',
  padding: 18,
  borderRadius: 12,
  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
} as const

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 22,
} as const

const segmentColors: Record<string, string> = {
  A: '#198754',
  B: '#fd7e14',
  C: '#dc3545',
}

function formatCurrency(value: number) {
  return `${(value || 0).toLocaleString('ru-RU')} ₽`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function Chip({ children, background = '#eef2f6', color = '#334155' }: { children: ReactNode, background?: string, color?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background, color, fontSize: 13, fontWeight: 600 }}>
      {children}
    </span>
  )
}

export default function AdminAnalytics({ token }: { token: string }) {
  const [stats, setStats] = useState<any>(null)
  const [userAnalytics, setUserAnalytics] = useState<any[]>([])
  const [abc, setAbc] = useState<any>({ ordersABC: [], selectionsABC: [] })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [filters, setFilters] = useState({ start: '', end: '' })

  const loadAnalytics = async (nextFilters = filters) => {
    setLoading(true)
    setMessage('')
    try {
      const params = {
        ...(nextFilters.start ? { start: nextFilters.start } : {}),
        ...(nextFilters.end ? { end: nextFilters.end } : {}),
      }

      const [statsResponse, usersResponse, abcResponse] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` }, params }),
        axios.get(`${API_URL}/admin/user-analytics`, { headers: { Authorization: `Bearer ${token}` }, params }),
        axios.get(`${API_URL}/admin/abc-analysis`, { headers: { Authorization: `Bearer ${token}` }, params }),
      ])

      setStats(statsResponse.data)
      setUserAnalytics(usersResponse.data)
      setAbc(abcResponse.data)
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось загрузить аналитику'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const topUser = userAnalytics[0]
  const topRevenueDish = abc.ordersABC?.[0]
  const topSelectionDish = abc.selectionsABC?.[0]

  const statusChips = useMemo(() => {
    if (!stats?.ordersByStatus) return []
    return Object.entries(stats.ordersByStatus)
  }, [stats])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #ffffff 0%, #f5f8ff 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h2 style={sectionTitleStyle}>Аналитика</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Здесь видно, кто заказывает больше всех, что чаще выбирают клиенты и какие блюда попадают в сегменты A, B и C.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: 2, flex: '1 1 120px', minWidth: 0 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>С</span>
              <input type="date" value={filters.start} onChange={(e) => { const v = e.target.value; setFilters(prev => ({ ...prev, start: v })); if (v || filters.end) setTimeout(() => loadAnalytics({ ...filters, start: v }), 100); }}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} />
            </label>
            <label style={{ display: 'grid', gap: 2, flex: '1 1 120px', minWidth: 0 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>По</span>
              <input type="date" value={filters.end} onChange={(e) => { const v = e.target.value; setFilters(prev => ({ ...prev, end: v })); if (v || filters.start) setTimeout(() => loadAnalytics({ ...filters, end: v }), 100); }}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }} />
            </label>
            <button onClick={() => loadAnalytics()} disabled={loading} style={{ background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Обновить'}
            </button>
            <button onClick={() => { const next = { start: '', end: '' }; setFilters(next); loadAnalytics(next) }} disabled={loading} style={{ background: '#e9ecef', color: '#212529', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Сбросить
            </button>
          </div>
        </div>

        {message && <div style={{ marginTop: 12, padding: 12, background: '#f8d7da', borderRadius: 8, fontSize: 14 }}>{message}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div style={cardStyle}><div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Пользователи</div><strong style={{ fontSize: 26 }}>{stats?.totalUsers ?? 0}</strong></div>
        <div style={cardStyle}><div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Заказы</div><strong style={{ fontSize: 26 }}>{stats?.totalOrders ?? 0}</strong></div>
        <div style={cardStyle}><div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Заказы сегодня</div><strong style={{ fontSize: 26 }}>{stats?.todayOrders ?? 0}</strong></div>
        <div style={cardStyle}><div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Выручка</div><strong style={{ fontSize: 26 }}>{formatCurrency(stats?.totalRevenue ?? 0)}</strong></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Лидер по выручке</div>
          <strong style={{ fontSize: 16 }}>{topUser ? ([topUser.firstName, topUser.lastName].filter(Boolean).join(' ') || topUser.email) : '—'}</strong>
          <div style={{ color: '#64748b', marginTop: 6, fontSize: 13 }}>{topUser ? formatCurrency(topUser.totalSpent) : 'Нет данных'}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Топ блюдо по выручке</div>
          <strong style={{ fontSize: 16 }}>{topRevenueDish?.name || '—'}</strong>
          <div style={{ color: '#64748b', marginTop: 6, fontSize: 13 }}>{topRevenueDish ? formatCurrency(topRevenueDish.metric) : 'Нет данных'}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#64748b', marginBottom: 6, fontSize: 13 }}>Топ блюдо по выборам</div>
          <strong style={{ fontSize: 16 }}>{topSelectionDish?.name || '—'}</strong>
          <div style={{ color: '#64748b', marginTop: 6, fontSize: 13 }}>{topSelectionDish ? `${topSelectionDish.metric} выборов` : 'Нет данных'}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Статусы заказов</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {statusChips.map(([status, count]) => (
            <Chip key={status}>{status}: {String(count)}</Chip>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Пользователи и их поведение</h3>
          <span style={{ color: '#64748b', fontSize: 12 }}>Сортировка по сумме заказов</span>
        </div>

        {loading && userAnalytics.length === 0 ? <p style={{ color: '#64748b' }}>Загрузка...</p> : userAnalytics.length === 0 ? <p style={{ color: '#64748b' }}>Пока нет данных</p> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {userAnalytics.map((user) => (
              <div key={user.userId} style={{ border: '1px solid #edf2f7', borderRadius: 12, padding: 14, background: '#fcfdff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <strong style={{ fontSize: 16 }}>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</strong>
                      {user.allergies && <Chip background="#fff3cd" color="#856404">Есть аллергии</Chip>}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13, display: 'grid', gap: 2 }}>
                      <span>{user.email}</span>
                      {user.phone && <span>{user.phone}</span>}
                      {user.companyName && <span>{user.companyName}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#64748b' }}>Баланс</span><strong>{formatCurrency(user.balance)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#64748b' }}>Лимит</span><strong>{formatCurrency(user.limit)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#64748b' }}>Лимит/день</span><strong>{formatCurrency(user.dailyLimit)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#64748b' }}>Последний</span><strong>{formatDate(user.lastOrderDate)}</strong></div>
                  </div>
                </div>

                {user.allergies && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#fff7e6', color: '#8a5a00', fontSize: 13 }}>
                    Аллергии: {user.allergies}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 10 }}><div style={{ color: '#64748b', fontSize: 12 }}>Заказов</div><strong style={{ fontSize: 15 }}>{user.totalOrders}</strong></div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 10 }}><div style={{ color: '#64748b', fontSize: 12 }}>Сумма</div><strong style={{ fontSize: 15 }}>{formatCurrency(user.totalSpent)}</strong></div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 10 }}><div style={{ color: '#64748b', fontSize: 12 }}>Средний чек</div><strong style={{ fontSize: 15 }}>{formatCurrency(user.averageOrderValue)}</strong></div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 10 }}><div style={{ color: '#64748b', fontSize: 12 }}>Заявок</div><strong style={{ fontSize: 15 }}>{user.weeklyMenuCount}</strong></div>
                  <div style={{ background: '#fff', borderRadius: 10, padding: 10 }}><div style={{ color: '#64748b', fontSize: 12 }}>Выбрано блюд</div><strong style={{ fontSize: 15 }}>{user.selectedDishCount}</strong></div>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  <div>
                    <div style={{ color: '#64748b', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Топ блюд</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {user.topDishes?.length ? user.topDishes.map((dish: any) => <Chip key={dish.name}>{dish.name} ({dish.quantity})</Chip>) : <span style={{ color: '#64748b', fontSize: 13 }}>Нет данных</span>}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Топ категорий</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {user.topCategories?.length ? user.topCategories.map((category: any) => <Chip key={category.name}>{category.name} ({category.quantity})</Chip>) : <span style={{ color: '#64748b', fontSize: 13 }}>Нет данных</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 18 }}>ABC по выручке</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {abc.ordersABC?.length ? abc.ordersABC.slice(0, 15).map((item: any) => (
              <div key={`revenue-${item.name}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #edf2f7', fontSize: 13 }}>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{item.category}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(item.metric)}</div>
                <div style={{ textAlign: 'right', width: 50 }}>{item.share}%</div>
              </div>
            )) : <p style={{ color: '#64748b', fontSize: 14 }}>Нет данных</p>}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 18 }}>ABC по выборам клиентов</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {abc.selectionsABC?.length ? abc.selectionsABC.slice(0, 15).map((item: any) => (
              <div key={`selection-${item.name}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #edf2f7', fontSize: 13 }}>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{item.category}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{item.metric}</div>
                <div style={{ textAlign: 'right', width: 50 }}>{item.share}%</div>
              </div>
            )) : <p style={{ color: '#64748b', fontSize: 14 }}>Нет данных</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
