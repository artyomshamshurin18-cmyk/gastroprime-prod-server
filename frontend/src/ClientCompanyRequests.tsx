import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { API_URL, MEDIA_URL } from './api-config';


const formatDate = (value: string) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })

export default function ClientCompanyRequests({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeDate, setActiveDate] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${API_URL}/users/company-dashboard/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(response.data)
      setActiveDate((prev) => prev || response.data.dates?.[0]?.date || '')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось загрузить заявки компании')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const activeEntry = useMemo(() => {
    return data?.dates?.find((entry: any) => entry.date === activeDate) || data?.dates?.[0] || null
  }, [data, activeDate])

  if (loading && !data) {
    return <div className="gp-soft-block">Загружаю заявки компании...</div>
  }

  if (error) {
    return <div className="gp-soft-block" style={{ color: '#842029', background: '#fff5f5' }}>{error}</div>
  }

  if (!data?.dates?.length) {
    return <div className="gp-soft-block">У компании пока нет запланированных заявок в выбранном периоде.</div>
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="gp-soft-block" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <strong>Запланированные заявки компании</strong>
          <div style={{ color: '#666', marginTop: 4 }}>{data.company?.name}</div>
        </div>
        <button onClick={loadRequests} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #d0d7de', background: '#fff' }}>Обновить</button>
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {data.dates.map((entry: any) => (
          <button
            key={entry.date}
            onClick={() => setActiveDate(entry.date)}
            style={{
              border: entry.date === activeEntry?.date ? '1px solid #0d6efd' : '1px solid #d0d7de',
              background: entry.date === activeEntry?.date ? '#eef5ff' : '#fff',
              borderRadius: 12,
              padding: '10px 14px',
              minWidth: 170,
              textAlign: 'left',
              flex: '0 0 auto',
            }}
          >
            <div style={{ fontWeight: 700 }}>{formatDate(entry.date)}</div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Сотрудников: {entry.employeesCount}</div>
            <div style={{ color: '#666', fontSize: 13 }}>Порций: {entry.totalPortions}</div>
          </button>
        ))}
      </div>

      {activeEntry && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Дата</div><strong>{formatDate(activeEntry.date)}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Сотрудников</div><strong>{activeEntry.employeesCount}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>В заявке</div><strong style={{ color: '#0d6efd' }}>{activeEntry.confirmedCount}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Черновики</div><strong style={{ color: '#fd7e14' }}>{activeEntry.draftCount}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Оплачено</div><strong style={{ color: '#28a745' }}>{activeEntry.paidCount || 0}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Отсрочка</div><strong style={{ color: '#fd7e14' }}>{activeEntry.deferredCount || 0}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Порций</div><strong>{activeEntry.totalPortions}</strong></div>
            <div className="gp-soft-block"><div style={{ color: '#666' }}>Сумма</div><strong>{activeEntry.totalAmount} ₽</strong></div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {activeEntry.employees.map((employee: any) => (
              <div key={`${activeEntry.date}-${employee.userId}`} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#f3f3f3', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {employee.avatarUrl ? <img src={MEDIA_URL(employee.avatarUrl)} alt={employee.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#999', fontSize: 11 }}>Фото</span>}
                    </div>
                    <div>
                      <strong>{employee.userName}</strong>
                      <div style={{ color: '#666', marginTop: 4 }}>Порций: {employee.totalPortions} • Сумма: {employee.totalAmount} ₽</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: employee.weeklyStatus === 'DRAFT' ? '#fd7e14' : employee.weeklyStatus === 'CONFIRMED' ? '#0d6efd' : employee.weeklyStatus === 'PAID' ? '#28a745' : employee.weeklyStatus === 'DEFERRED' ? '#fd7e14' : '#fd7e14' }}>
                    {employee.weeklyStatus === 'DRAFT' ? 'Черновик' : employee.weeklyStatus === 'CONFIRMED' ? 'В заявке' : employee.weeklyStatus === 'PAID' ? 'Оплачено' : employee.weeklyStatus === 'DEFERRED' ? 'Отсрочка' : employee.weeklyStatus === 'COMPLETED' ? 'Выполнено' : 'Черновик'}
                    {(employee.weeklyStatus === 'PAID' || employee.weeklyStatus === 'DEFERRED') && (
                      <button onClick={async () => {
                        if (!confirm('Отменить заявку? ' + (employee.weeklyStatus === 'PAID' ? 'Средства вернутся на баланс.' : 'Отсрочка будет аннулирована.'))) return;
                        try {
                          await axios.post(API_URL + '/users/company-dashboard/cancel-request', { weeklyMenuId: employee.weeklyMenuId }, {
                            headers: { Authorization: 'Bearer ' + token }
                          });
                          loadRequests();
                          setError('\u2705 Заявка отменена');
                        } catch (err) {
                          const msg = (err as any)?.response?.data?.message || 'Ошибка отмены';
                          setError('\u274c ' + msg);
                        }
                      }} style={{ marginLeft: 8, background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                        Отменить
                      </button>
                    )}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                  {employee.items.map((item: any) => (
                    <div key={`${employee.userId}-${item.dishId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f8f9fa' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.dishName}</div>
                        <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{item.categoryName}</div>
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div>× {item.quantity}</div>
                        <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{item.total} ₽</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
