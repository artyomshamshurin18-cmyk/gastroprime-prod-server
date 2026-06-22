import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from './api-config';


const typeLabels: Record<string, string> = {
  PERIOD: 'За период',
  PREPAYMENT: 'Предоплата',
}

export default function ClientInvoices({ token, onUserRefresh }: { token: string, onUserRefresh?: () => Promise<void> | void }) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requestForm, setRequestForm] = useState({ amount: '', comment: '' })
  const [requesting, setRequesting] = useState(false)
  const [reconciliationForm, setReconciliationForm] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  })
  const [reconciliation, setReconciliation] = useState<any>(null)
  const [reconciliationLoading, setReconciliationLoading] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/users/company/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setInvoices(response.data)
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось загрузить счета'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const sync = async () => {
      await loadInvoices()
      await onUserRefresh?.()
    }

    sync()

    const intervalId = window.setInterval(sync, 10000)
    const onFocus = () => { void sync() }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sync()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const requestPrepayment = async () => {
    setRequesting(true)
    setMessage('')
    try {
      await axios.post(`${API_URL}/users/company/invoices/prepayment`, {
        amount: Number(requestForm.amount) || 0,
        comment: requestForm.comment,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('✅ Счет на предоплату создан')
      setRequestForm({ amount: '', comment: '' })
      await loadInvoices()
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось запросить счет'}`)
    } finally {
      setRequesting(false)
    }
  }

  const payWithRobokassa = async () => {
    setRequesting(true)
    setMessage('')
    try {
      const response = await axios.post(`${API_URL}/users/company/invoices/prepayment/robokassa`, {
        amount: Number(requestForm.amount) || 0,
        comment: requestForm.comment,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.data?.paymentUrl) {
        throw new Error('Не удалось получить ссылку на оплату')
      }
      window.location.href = response.data.paymentUrl
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || err.message || 'Не удалось перейти к оплате'}`)
      setRequesting(false)
    }
  }

  const downloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    const response = await axios.get(`${API_URL}/users/company/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoiceNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const loadReconciliation = async () => {
    setReconciliationLoading(true)
    setMessage('')
    try {
      const response = await axios.get(`${API_URL}/users/company/reconciliation`, {
        headers: { Authorization: `Bearer ${token}` },
        params: reconciliationForm,
      })
      setReconciliation(response.data)
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось получить сверку'}`)
    } finally {
      setReconciliationLoading(false)
    }
  }

  return (
    <div>
      <h2>Счета компании</h2>
      <p style={{ color: '#666', marginTop: -5, marginBottom: 15 }}>Здесь можно скачать выставленные счета и запросить счет на предоплату для пополнения баланса.</p>

      {message && <div style={{ padding: 12, background: message.includes('❌') ? '#f8d7da' : '#d4edda', marginBottom: 20, borderRadius: 6 }}>{message}</div>}

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Запросить счет на предоплату</h3>
        <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
          <input type="number" min="1" placeholder="Сумма предоплаты" value={requestForm.amount} onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))} />
          <input placeholder="Комментарий" value={requestForm.comment} onChange={(e) => setRequestForm(prev => ({ ...prev, comment: e.target.value }))} />
          <button onClick={requestPrepayment} disabled={requesting} style={{ background: '#6f42c1', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
            {requesting ? 'Создаю...' : 'Запросить счет на предоплату'}
          </button>
          <button onClick={payWithRobokassa} disabled={requesting} style={{ background: '#e85d04', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
            {requesting ? 'Переход...' : 'Оплатить онлайн через Robokassa'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Сверка по компании</h3>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: '#666', fontSize: 13 }}>С</span>
            <input type="date" value={reconciliationForm.start} onChange={(e) => setReconciliationForm(prev => ({ ...prev, start: e.target.value }))} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: '#666', fontSize: 13 }}>По</span>
            <input type="date" value={reconciliationForm.end} onChange={(e) => setReconciliationForm(prev => ({ ...prev, end: e.target.value }))} />
          </label>
          <button onClick={loadReconciliation} disabled={reconciliationLoading} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
            {reconciliationLoading ? 'Собираю...' : 'Запросить сверку'}
          </button>
          {reconciliation && (
            <button onClick={async () => {
              try {
                const response = await axios.get(`${API_URL}/users/company/reconciliation/pdf`, {
                  params: reconciliationForm,
                  headers: { Authorization: `Bearer ${token}` },
                  responseType: 'blob',
                })
                const url = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement('a')
                link.href = url
                link.download = `sverka_${reconciliationForm.start}_${reconciliationForm.end}.pdf`
                document.body.appendChild(link)
                link.click()
                link.remove()
                window.URL.revokeObjectURL(url)
              } catch (err: any) {
                setMessage(`❌ ${err.response?.data?.message || 'Не удалось скачать PDF'}`)
              }
            }} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 16px', width: '100%' }}>
              📄 Скачать PDF сверки
            </button>
          )}
        </div>

        {reconciliation && (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}><div style={{ color: '#666' }}>Дней с заказами</div><strong>{reconciliation.summary?.daysWithOrders || 0}</strong></div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}><div style={{ color: '#666' }}>Подтверждено</div><strong>{reconciliation.summary?.closedDays || 0}</strong></div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}><div style={{ color: '#666' }}>Открыто</div><strong>{reconciliation.summary?.openDays || 0}</strong></div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8 }}><div style={{ color: '#666' }}>Итого</div><strong>{reconciliation.summary?.total || 0} ₽</strong></div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {(reconciliation.rows || []).map((row: any) => (
                <div key={row.date} style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{new Date(row.date).toLocaleDateString('ru-RU')}</strong>
                    <span>{row.total} ₽</span>
                  </div>
                  <div style={{ color: '#666', marginTop: 6, fontSize: 14 }}>
                    Порций: {row.portions}, сотрудников: {row.usersCount}, статус доставки: {row.deliveryStatus || 'не закрыто'}
                  </div>
                  {(row.deviationAmount || row.managerComment || row.deviationComment) && (
                    <div style={{ color: '#856404', marginTop: 6, fontSize: 14 }}>
                      Отклонение: {row.deviationAmount || 0} ₽ {row.deviationComment ? `• ${row.deviationComment}` : ''} {row.managerComment ? `• ${row.managerComment}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>Выставленные счета</h3>
        {loading ? <p>Загрузка...</p> : invoices.length === 0 ? <p>Счетов пока нет</p> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {invoices.map(invoice => (
              <div key={invoice.id} style={{ border: '1px solid #e9ecef', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{invoice.number}</strong>
                    <div style={{ color: '#666', marginTop: 4 }}>{typeLabels[invoice.type] || invoice.type}</div>
                    {invoice.periodStart && invoice.periodEnd && <div style={{ color: '#666', fontSize: 14 }}>Период: {new Date(invoice.periodStart).toLocaleDateString('ru-RU')} - {new Date(invoice.periodEnd).toLocaleDateString('ru-RU')}</div>}
                  </div>
                  <div style={{ textAlign: 'left', minWidth: 180 }}>
                    <div>Сумма: <strong>{invoice.total} ₽</strong></div>
                    <button onClick={() => downloadPdf(invoice.id, invoice.number)} style={{ marginTop: 8, background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', width: '100%' }}>Скачать PDF</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
