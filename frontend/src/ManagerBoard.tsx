import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import CrmMain from './crm/CrmMain'
import { io } from 'socket.io-client'
import { API_URL, MEDIA_URL } from './api-config';

const SOCKET_URL = API_URL.replace(/\/api$/, '')

const companyStatusLabels: Record<string, string> = {
  ONBOARDING: 'Подключение',
  ACTIVE: 'В работе',
  ON_HOLD: 'На стопе',
  TERMINATED: 'Закрыт',
}

const weeklyMenuStatusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'На рассмотрении',
  CONFIRMED: 'Подтверждена',
  REJECTED: 'Отклонена',
  COMPLETED: 'Выполнена',
}

const internalRoles = ['ADMIN', 'SUPERADMIN', 'MANAGER']
const QUICK_EMOJI = ['👍', '🙂', '🔥', '🙏', '✅', '❤️']

interface ManagerBoardCompany {
  id: string
  name: string
  status: string
  contactPerson?: string
  workEmail?: string
  routeName?: string
  deliveryTime?: string
  dailyLimit?: number
  notes?: string
  categoryPrices?: Array<{
    categoryId: string
    categoryName: string
    price: number
  }>
  summary: {
    employeesTotal: number
    employeesWithRequest: number
    employeesWithoutRequest: number
    hasRequests: boolean
    latestWeeklyMenuStatus?: string | null
    latestWeeklyMenuAt?: string | null
  }
  pendingUsers: Array<{
    id: string
    name: string
    email: string
  }>
  latestMessage?: {
    text: string
    createdAt: string
    senderName: string
    senderRole: string
  } | null
}

interface CategoryOption {
  id: string
  name: string
}

interface ChatAttachment {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  sizeBytes: number
  kind: string
}

interface ChatMessage {
  id: string
  text: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  attachments: ChatAttachment[]
}

interface ChatParticipant {
  id: string
  name: string
  email: string
  role: string
  canManageParticipants: boolean
  companyId?: string | null
}

interface ChatCandidate {
  id: string
  name: string
  email: string
  role: string
}

interface ChatInvite {
  id: string
  token: string
  label?: string | null
  expiresAt?: string | null
  createdAt: string
  guestCount: number
}

interface ChatDetail {
  company: {
    id: string
    name: string
    status: string
  }
  conversation: {
    id: string
    companyId: string
    unreadCount: number
    participants: ChatParticipant[]
    availableCandidates: ChatCandidate[]
    invites: ChatInvite[]
    messages: ChatMessage[]
  }
}

interface ChatSummaryItem {
  companyId: string
  companyName: string
  unreadCount: number
  latestMessage: {
    id: string
    text: string
    createdAt: string
    senderName: string
    senderRole: string
  } | null
}

interface CompanyDraft {
  name: string
  status: string
  contactPerson: string
  workEmail: string
  routeName: string
  deliveryTime: string
  dailyLimit: number
  notes: string
  categoryPrices: Record<string, string>
}

const toCategoryPriceDraft = (items?: Array<{ categoryId: string, price: number }>) => Object.fromEntries((items || []).map((item) => [item.categoryId, String(item.price)]))
const serializeCategoryPrices = (value: Record<string, string>) => Object.entries(value)
  .map(([categoryId, price]) => ({ categoryId, price: Number(price) }))
  .filter((item) => item.categoryId && Number.isFinite(item.price) && item.price > 0)

const makeDraft = (company: ManagerBoardCompany): CompanyDraft => ({
  name: company.name || '',
  status: company.status || 'ACTIVE',
  contactPerson: company.contactPerson || '',
  workEmail: company.workEmail || '',
  routeName: company.routeName || '',
  deliveryTime: company.deliveryTime || '',
  dailyLimit: company.dailyLimit || 0,
  notes: company.notes || '',
  categoryPrices: toCategoryPriceDraft(company.categoryPrices),
})

export default function ManagerBoard({ token, onImpersonate }: { token: string, onImpersonate: (token: string, user: any) => void }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState("")
  const [companies, setCompanies] = useState<ManagerBoardCompany[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CompanyDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openedChatId, setOpenedChatId] = useState<string | null>(null)
  const [chatDetails, setChatDetails] = useState<Record<string, ChatDetail>>({})
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({})
  const [showCrm, setShowCrm] = useState(false)
  const [chatFiles, setChatFiles] = useState<Record<string, File[]>>({})
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null)
  const [chatSendingId, setChatSendingId] = useState<string | null>(null)
  const [participantDrafts, setParticipantDrafts] = useState<Record<string, string>>({})
  const [chatSummary, setChatSummary] = useState<Record<string, ChatSummaryItem>>({})
  const [inviteDrafts, setInviteDrafts] = useState<Record<string, string>>({})
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null)
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)
  const summaryRef = useRef<Record<string, string | null>>({})
  const openedChatIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    openedChatIdRef.current = openedChatId
  }, [openedChatId])

  const notify = (title: string, body: string) => {
    if (!('Notification' in window)) return
    if (document.visibilityState === 'visible') return
    if (Notification.permission !== 'granted') return
    new Notification(title, { body })
  }

  const playNotificationTone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.03
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.14)
      oscillator.onended = () => context.close()
    } catch {
      // ignore audio errors
    }
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  const loadBoard = async (searchValue = search) => {
    setLoading(true)
    setMessage('')
    try {
      const response = await axios.get(`${API_URL}/admin/manager-board`, {
        headers: { Authorization: `Bearer ${token}` },
        params: searchValue.trim() ? { search: searchValue.trim() } : undefined,
      })
      const nextCompanies = response.data || []
      setCompanies(nextCompanies)
      setDrafts((prev) => Object.fromEntries(nextCompanies.map((company: ManagerBoardCompany) => [company.id, prev[company.id] || makeDraft(company)])))
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось загрузить доску клиентов'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const nextSummary = Object.fromEntries((response.data || []).map((item: ChatSummaryItem) => [item.companyId, item]))

      Object.values(nextSummary).forEach((item) => {
        const previousId = summaryRef.current[item.companyId]
        const nextId = item.latestMessage?.id || null
        if (previousId && nextId && previousId !== nextId && item.latestMessage && !internalRoles.includes(item.latestMessage.senderRole)) {
          playNotificationTone()
          notify(`Новое сообщение от ${item.companyName}`, item.latestMessage.text || 'В чат пришло новое вложение')
        }
        summaryRef.current[item.companyId] = nextId
      })

      setChatSummary(nextSummary)
    } catch (err) {
      console.error(err)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCategories(response.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const openClientCabinet = async (companyId: string) => {
    setImpersonatingId(companyId)
    setMessage('')
    try {
      const response = await axios.post(`${API_URL}/admin/companies/${companyId}/impersonate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const nextToken = response.data?.access_token || response.data?.token
      const nextUser = response.data?.user
      if (!nextToken || !nextUser) {
        throw new Error('Не удалось открыть кабинет клиента')
      }
      onImpersonate(nextToken, nextUser)
    } catch (err: any) {
      console.error(err)
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось открыть кабинет клиента'}`)
    } finally {
      setImpersonatingId(null)
    }
  }

  const loadChat = async (companyId: string, silent = false) => {
    if (!silent) setChatLoadingId(companyId)
    try {
      const response = await axios.get(`${API_URL}/chat/company/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setChatDetails(prev => ({ ...prev, [companyId]: response.data }))
      await loadSummary()
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось загрузить чат компании'}`)
    } finally {
      if (!silent) setChatLoadingId(null)
    }
  }

  useEffect(() => {
    loadBoard('')
    loadSummary()
    loadCategories()
    const interval = window.setInterval(() => loadSummary(), 30000)
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      path: '/socket.io',
    })

    socket.on('chat:updated', (payload: { companyId?: string }) => {
      loadSummary()
      if (payload?.companyId && openedChatIdRef.current === payload.companyId) {
        loadChat(payload.companyId, true)
      }
    })

    return () => {
      window.clearInterval(interval)
      socket.disconnect()
    }
  }, [])

  const openChat = async (companyId: string) => {
    setOpenedChatId(companyId)
    await loadChat(companyId)
  }

  const closeChat = () => {
    setOpenedChatId(null)
  }

  const sendChatMessage = async (companyId: string) => {
    const text = (chatInputs[companyId] || '').trim()
    const files = chatFiles[companyId] || []
    if (!text && !files.length) return

    setChatSendingId(companyId)
    try {
      const formData = new FormData()
      if (text) formData.append('text', text)
      files.forEach((file) => formData.append('files', file))

      const response = await axios.post(`${API_URL}/chat/company/${companyId}/messages`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatDetails(prev => ({ ...prev, [companyId]: response.data }))
      setChatInputs(prev => ({ ...prev, [companyId]: '' }))
      setChatFiles(prev => ({ ...prev, [companyId]: [] }))
      await Promise.all([loadBoard(search), loadSummary()])
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось отправить сообщение в чат'}`)
    } finally {
      setChatSendingId(null)
    }
  }

  const addParticipant = async (companyId: string) => {
    const userId = participantDrafts[companyId]
    if (!userId) return

    try {
      const response = await axios.post(`${API_URL}/chat/company/${companyId}/participants`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatDetails(prev => ({ ...prev, [companyId]: response.data }))
      setParticipantDrafts(prev => ({ ...prev, [companyId]: '' }))
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось добавить участника'}`)
    }
  }

  const removeParticipant = async (companyId: string, userId: string) => {
    try {
      const response = await axios.delete(`${API_URL}/chat/company/${companyId}/participants/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatDetails(prev => ({ ...prev, [companyId]: response.data }))
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось удалить участника'}`)
    }
  }

  const createInvite = async (companyId: string) => {
    setInviteLoadingId(companyId)
    try {
      const response = await axios.post(`${API_URL}/chat/company/${companyId}/invites`, {
        label: (inviteDrafts[companyId] || '').trim() || undefined,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatDetails(prev => ({ ...prev, [companyId]: response.data }))
      setInviteDrafts(prev => ({ ...prev, [companyId]: '' }))
      setMessage('✅ Invite-ссылка создана')
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось создать invite-ссылку'}`)
    } finally {
      setInviteLoadingId(null)
    }
  }

  const revokeInvite = async (companyId: string, inviteId: string) => {
    try {
      const response = await axios.delete(`${API_URL}/chat/company/${companyId}/invites/${inviteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatDetails(prev => ({ ...prev, [companyId]: response.data }))
      setMessage('✅ Invite-ссылка отозвана')
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось отозвать invite-ссылку'}`)
    }
  }

  const copyInviteLink = async (inviteToken: string) => {
    const link = `${window.location.origin}/chat/invite/${inviteToken}`
    try {
      await navigator.clipboard.writeText(link)
      setMessage('✅ Ссылка скопирована')
    } catch {
      setMessage(link)
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

  const updateCategoryPrice = (companyId: string, categoryId: string, value: string) => {
    setDrafts(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        categoryPrices: {
          ...(prev[companyId]?.categoryPrices || {}),
          [categoryId]: value,
        },
      },
    }))
  }

  const saveCompany = async (companyId: string) => {
    const draft = drafts[companyId]
    if (!draft?.name.trim()) {
      setMessage('❌ Название клиента не может быть пустым')
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
      setMessage('✅ Карточка клиента обновлена')
      await loadBoard(search)
      setEditingId(null)
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Не удалось обновить карточку клиента'}`)
    } finally {
      setSavingId(null)
    }
  }

  const boardStats = useMemo(() => ({
    total: companies.length,
    withRequests: companies.filter(company => company.summary.hasRequests).length,
    withoutRequests: companies.filter(company => !company.summary.hasRequests).length,
  }), [companies])

  const activeCompany = companies.find((company) => company.id === openedChatId) || null
  const activeDetail = openedChatId ? chatDetails[openedChatId] : null
  const activeMessages = activeDetail?.conversation?.messages || []
  const activeParticipants = activeDetail?.conversation?.participants || []
  const activeCandidates = activeDetail?.conversation?.availableCandidates || []
  const activeInvites = activeDetail?.conversation?.invites || []

  useEffect(() => {
    if (!openedChatId || !activeMessages.length) return
    scrollToBottom(activeMessages.length <= 1 ? 'auto' : 'smooth')
  }, [openedChatId, activeMessages.length])

  return (
    <div>
      {showCrm ? (
        <CrmMain token={token} userRole="MANAGER" />
      ) : (
        <>
      <h2>Доска клиентов</h2>
      <p style={{ color: '#666', marginTop: -5, marginBottom: 18 }}>
        Здесь видно, кто из клиентов уже прислал заявки на плановое меню, а кого ещё нужно подтолкнуть. Можно быстро найти клиента, открыть групповой чат, добавить участников и поправить карточку.
      </p>

      {message && <div style={{ padding: 12, background: message.includes('❌') ? '#f8d7da' : '#d4edda', borderRadius: 8, marginBottom: 18 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div className="gp-kpi-card"><div className="gp-kpi-card__label">Всего клиентов</div><strong>{boardStats.total}</strong></div>
        <div className="gp-kpi-card"><div className="gp-kpi-card__label">Есть заявки</div><strong style={{ color: '#198754' }}>{boardStats.withRequests}</strong></div>
        <div className="gp-kpi-card"><div className="gp-kpi-card__label">Нужно напомнить</div><strong style={{ color: '#b42318' }}>{boardStats.withoutRequests}</strong></div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadBoard(search) }}
          placeholder="Поиск по названию клиента"
          style={{ flex: '1 1 280px' }}
        />
        <button onClick={() => loadBoard(search)} disabled={loading} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px' }}>
          {loading ? 'Ищу...' : 'Найти'}
        </button>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 12, padding: "10px 16px", fontSize: 14 }}>
          <option value="">Все статусы</option>
          <option value="ACTIVE">В работе</option>
          <option value="ONBOARDING">Подключение</option>
          <option value="CRM_LEAD">Лид</option>
          <option value="ON_HOLD">На стопе</option>
          <option value="TERMINATED">Расторгнуто</option>
          <option value="ARCHIVED">Архив</option>
          <option value="BLOCKED">Заблокировано</option>
        </select>
        <button onClick={() => { setSearch(''); loadBoard('') }} disabled={loading} style={{ background: '#fff7f1', color: '#b53b1f', border: '1px solid #f1d5c3', borderRadius: 12, padding: '10px 16px' }}>
          Сбросить
        </button>
        <button onClick={requestNotificationPermission} style={{ background: '#fff7f1', color: '#b53b1f', border: '1px solid #f1d5c3', borderRadius: 12, padding: '10px 16px' }}>
          Включить уведомления
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#666' }}>Загрузка доски клиентов...</div>
      ) : companies.length === 0 ? (
        <div style={{ color: '#666' }}>Клиенты не найдены</div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {companies.filter((company) => !statusFilter || company.status === statusFilter).map((company) => {
            const draft = drafts[company.id] || makeDraft(company)
            const isEditing = editingId === company.id
            const summary = chatSummary[company.id]

            return (
              <div key={company.id} style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(237,57,21,0.10)', boxShadow: '0 14px 32px rgba(38, 23, 14, 0.06)', overflow: 'hidden' }}>
                <div style={{ padding: 18, borderBottom: '1px solid #f1e5db', background: company.summary.hasRequests ? 'linear-gradient(135deg, #f4fff6 0%, #ffffff 100%)' : 'linear-gradient(135deg, #fff4f2 0%, #ffffff 100%)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: 18 }}>{company.name}</strong>
                      <div style={{ color: '#666', marginTop: 4 }}>{companyStatusLabels[company.status] || company.status}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                      <div style={{ padding: '6px 10px', borderRadius: 999, background: company.summary.hasRequests ? '#d1e7dd' : '#f8d7da', color: company.summary.hasRequests ? '#155724' : '#842029', fontWeight: 700, fontSize: 12 }}>
                        {company.summary.hasRequests ? 'Есть заявки' : 'Нужно напомнить'}
                      </div>
                      {summary?.unreadCount ? (
                        <div style={{ padding: '6px 10px', borderRadius: 999, background: '#fff0cc', color: '#8a5a00', fontWeight: 700, fontSize: 12 }}>
                          Непрочитано: {summary.unreadCount}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Сотрудников</div><strong>{company.summary.employeesTotal}</strong></div>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>С заявкой</div><strong style={{ color: '#198754' }}>{company.summary.employeesWithRequest}</strong></div>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Без заявки</div><strong style={{ color: '#b42318' }}>{company.summary.employeesWithoutRequest}</strong></div>
                  </div>
                </div>

                <div style={{ padding: 18, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 6, color: '#4b3a30' }}>
                    <div><strong>Контакт:</strong> {company.contactPerson || 'Не указан'}</div>
                    <div><strong>Email:</strong> {company.workEmail || 'Не указан'}</div>
                    <div><strong>Маршрут:</strong> {company.routeName || 'Не указан'}</div>
                    <div><strong>Доставка:</strong> {company.deliveryTime || 'Не указана'}</div>
                  </div>

                  <div style={{ padding: 12, borderRadius: 14, background: '#fff7f1', color: '#6b4b3a' }}>
                    <div><strong>Последняя заявка:</strong> {company.summary.latestWeeklyMenuStatus ? (weeklyMenuStatusLabels[company.summary.latestWeeklyMenuStatus] || company.summary.latestWeeklyMenuStatus) : 'Пока нет'}</div>
                    <div style={{ marginTop: 6 }}><strong>Последнее сообщение:</strong> {summary?.latestMessage ? `${summary.latestMessage.senderName}: ${summary.latestMessage.text || 'Вложение'}` : company.latestMessage ? `${company.latestMessage.senderName}: ${company.latestMessage.text}` : 'Чат пока пустой'}</div>
                  </div>

                  {company.pendingUsers.length > 0 && (
                    <div style={{ padding: 12, borderRadius: 14, background: '#fff5f6', color: '#842029' }}>
                      <strong>Кого напомнить:</strong>
                      <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                        {company.pendingUsers.map((pendingUser) => (
                          <div key={pendingUser.id}>{pendingUser.name} · {pendingUser.email}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => setEditingId(prev => prev === company.id ? null : company.id)} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px' }}>
                      {isEditing ? 'Скрыть редактирование' : 'Редактировать карточку'}
                    </button>
                    <button onClick={() => openClientCabinet(company.id)} disabled={impersonatingId === company.id} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px' }}>
                      {impersonatingId === company.id ? 'Открываю кабинет...' : 'В кабинет клиента'}
                    </button>
                    <button onClick={() => openChat(company.id)} style={{ background: '#fff7f1', color: '#b53b1f', border: '1px solid #f1d5c3', borderRadius: 12, padding: '10px 14px' }}>
                      Открыть чат
                    </button>
                  </div>

                  {isEditing && (
                    <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: '#fcfdff', border: '1px solid #d9e8ff' }}>
                      <input value={draft.name} onChange={(e) => updateDraft(company.id, 'name', e.target.value)} placeholder="Название клиента" />
                      <select value={draft.status} onChange={(e) => updateDraft(company.id, 'status', e.target.value)}>
                        {Object.entries(companyStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input value={draft.contactPerson} onChange={(e) => updateDraft(company.id, 'contactPerson', e.target.value)} placeholder="Контактное лицо" />
                      <input value={draft.workEmail} onChange={(e) => updateDraft(company.id, 'workEmail', e.target.value)} placeholder="Рабочий email" />
                      <input value={draft.routeName} onChange={(e) => updateDraft(company.id, 'routeName', e.target.value)} placeholder="Маршрут" />
                      <input value={draft.deliveryTime} onChange={(e) => updateDraft(company.id, 'deliveryTime', e.target.value)} placeholder="Время доставки" />
                      <input type="number" value={draft.dailyLimit} onChange={(e) => updateDraft(company.id, 'dailyLimit', Number(e.target.value) || 0)} placeholder="Лимит в день" />
                      <textarea value={draft.notes} onChange={(e) => updateDraft(company.id, 'notes', e.target.value)} placeholder="Заметки" rows={4} />
                      {categories.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: 12, borderRadius: 14, background: '#fff7f1', border: '1px solid #f1d5c3' }}>
                          <strong>Персональные цены по категориям</strong>
                          <div style={{ color: '#6f6a64', marginTop: 6, marginBottom: 10 }}>Это верховые цены для клиента. Если поле пустое, остается базовая цена блюда.</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                            {categories.map((category) => (
                              <label key={category.id} style={{ display: 'grid', gap: 6 }}>
                                <span style={{ fontSize: 14 }}>{category.name}</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="Базовая цена"
                                  value={draft.categoryPrices[category.id] || ''}
                                  onChange={(e) => updateCategoryPrice(company.id, category.id, e.target.value)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => saveCompany(company.id)} disabled={savingId === company.id} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px' }}>
                          {savingId === company.id ? 'Сохраняю...' : 'Сохранить карточку'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {openedChatId && (
        <div className="gp-chat-modal-overlay" onClick={closeChat}>
          <div onClick={(e) => e.stopPropagation()} className="gp-chat-modal">
            <div className="gp-chat-modal__header" style={{ padding: 18, borderBottom: '1px solid #f1e5db', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 20 }}>{activeCompany?.name || activeDetail?.company?.name || 'Чат клиента'}</strong>
                <div style={{ color: '#666', marginTop: 4 }}>Большое окно переписки. Здесь уже удобно вести диалог и добавлять участников.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={requestNotificationPermission} style={{ background: '#fff7f1', color: '#b53b1f', border: '1px solid #f1d5c3', borderRadius: 12, padding: '10px 14px' }}>
                  Включить уведомления
                </button>
                <button onClick={() => openedChatId && loadChat(openedChatId)} style={{ background: '#fff7f1', color: '#b53b1f', border: '1px solid #f1d5c3', borderRadius: 12, padding: '10px 14px' }}>
                  Обновить
                </button>
                <button onClick={closeChat} style={{ background: '#1c1a18', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px' }}>
                  Закрыть
                </button>
              </div>
            </div>

            <div className="gp-chat-modal__body">
              <div className="gp-chat-sidebar">
                <div style={{ display: 'grid', gap: 8 }}>
                  <strong>Участники чата</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeParticipants.map((participant) => (
                      <div key={participant.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 999, background: internalRoles.includes(participant.role) ? '#fff0e8' : '#eef6ff', color: '#4b3a30' }}>
                        <span>{participant.name}</span>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>{participant.role}</span>
                        <button onClick={() => openedChatId && removeParticipant(openedChatId, participant.id)} style={{ border: 'none', background: 'transparent', color: '#b53b1f', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {activeCandidates.length > 0 && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <strong>Добавить в чат</strong>
                    <select value={participantDrafts[openedChatId] || ''} onChange={(e) => setParticipantDrafts(prev => ({ ...prev, [openedChatId]: e.target.value }))}>
                      <option value="">Сотрудник компании или коллега GastroPrime</option>
                      {activeCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.role}</option>)}
                    </select>
                    <button onClick={() => addParticipant(openedChatId)} disabled={!(participantDrafts[openedChatId] || '')} style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px' }}>
                      Добавить участника
                    </button>
                  </div>
                )}

                <div style={{ display: 'grid', gap: 8 }}>
                  <strong>Invite-ссылки для внешних гостей</strong>
                  <input
                    value={inviteDrafts[openedChatId] || ''}
                    onChange={(e) => setInviteDrafts(prev => ({ ...prev, [openedChatId]: e.target.value }))}
                    placeholder="Например: бухгалтер клиента, подрядчик, гость"
                  />
                  <button onClick={() => createInvite(openedChatId)} disabled={inviteLoadingId === openedChatId} style={{ background: '#198754', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px' }}>
                    {inviteLoadingId === openedChatId ? 'Создаю...' : 'Создать invite-ссылку'}
                  </button>
                  {activeInvites.length === 0 ? (
                    <div style={{ color: '#666', fontSize: 14 }}>Активных ссылок пока нет</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {activeInvites.map((invite) => (
                        <div key={invite.id} style={{ padding: 10, borderRadius: 12, background: '#f7faf7', border: '1px solid #d8eadb', display: 'grid', gap: 8 }}>
                          <div style={{ fontWeight: 600 }}>{invite.label || 'Гостевой доступ'}</div>
                          <div style={{ color: '#666', fontSize: 13 }}>Гостей вошло: {invite.guestCount}</div>
                          <div style={{ color: '#666', fontSize: 13 }}>Действует до: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString('ru-RU') : 'без ограничения'}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button onClick={() => copyInviteLink(invite.token)} style={{ background: '#fff', color: '#198754', border: '1px solid #b7d7be', borderRadius: 10, padding: '8px 10px' }}>
                              Скопировать ссылку
                            </button>
                            <button onClick={() => revokeInvite(openedChatId, invite.id)} style={{ background: '#fff', color: '#b42318', border: '1px solid #f1c6c2', borderRadius: 10, padding: '8px 10px' }}>
                              Отозвать
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="gp-chat-main">
                <div className="gp-chat-messages">
                  {chatLoadingId === openedChatId && !activeMessages.length ? (
                    <div style={{ color: '#666' }}>Загрузка чата...</div>
                  ) : activeMessages.length === 0 ? (
                    <div style={{ color: '#666' }}>Сообщений пока нет</div>
                  ) : (
                    activeMessages.map((chatMessage) => {
                      const isManager = internalRoles.includes(chatMessage.user.role)
                      return (
                        <div key={chatMessage.id} className="gp-chat-message-card" style={{ padding: '12px 14px', borderRadius: 16, background: isManager ? '#fff7f1' : '#f6fbff', border: isManager ? '1px solid #f1d5c3' : '1px solid #d9e8ff', maxWidth: '85%' }}>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                            {chatMessage.user.name} · {isManager ? 'GastroPrime' : 'Клиент'} · {new Date(chatMessage.createdAt).toLocaleString('ru-RU')}
                          </div>
                          {chatMessage.text && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{chatMessage.text}</div>}
                          {chatMessage.attachments.length > 0 && (
                            <div style={{ display: 'grid', gap: 8, marginTop: chatMessage.text ? 10 : 0 }}>
                              {chatMessage.attachments.map((attachment) => (
                                <a key={attachment.id} href={MEDIA_URL(attachment.fileUrl)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 12, background: '#fff', color: '#b53b1f', textDecoration: 'none' }}>
                                  <span>{attachment.kind === 'IMAGE' ? '🖼️' : '📎'}</span>
                                  <span>{attachment.fileName}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="gp-chat-composer" style={{ padding: 18, borderTop: '1px solid #f1e5db', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {QUICK_EMOJI.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => setChatInputs(prev => ({ ...prev, [openedChatId]: `${prev[openedChatId] || ''}${emoji}` }))} style={{ background: '#fff7f1', color: '#b53b1f', border: '1px solid #f1d5c3', borderRadius: 12, padding: '6px 10px' }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={chatInputs[openedChatId] || ''}
                    onChange={(e) => setChatInputs(prev => ({ ...prev, [openedChatId]: e.target.value }))}
                    placeholder="Написать клиенту..."
                    rows={4}
                  />
                  <input type="file" multiple onChange={(e) => setChatFiles(prev => ({ ...prev, [openedChatId]: Array.from(e.target.files || []) }))} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
                  {(chatFiles[openedChatId] || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(chatFiles[openedChatId] || []).map((file) => <span key={`${file.name}-${file.size}`} style={{ padding: '6px 10px', borderRadius: 999, background: '#fff7f1', color: '#b53b1f', fontSize: 13 }}>{file.name}</span>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => sendChatMessage(openedChatId)} disabled={chatSendingId === openedChatId || (!(chatInputs[openedChatId] || '').trim() && !(chatFiles[openedChatId] || []).length)} style={{ background: 'linear-gradient(135deg, #ed3915 0%, #ff6a3d 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 18px', minWidth: 200 }}>
                      {chatSendingId === openedChatId ? 'Отправляю...' : 'Отправить'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
      )}
      <button 
        onClick={() => setShowCrm(v => !v)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 999,
          padding: '10px 16px', borderRadius: 24, border: 'none',
          background: showCrm ? '#e8f0fe' : '#0d6efd',
          color: showCrm ? '#0056b3' : '#fff',
          fontWeight: 600, fontSize: 13, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        📋 CRM {showCrm ? '✕' : '→'}
      </button>
    </div>
  )
}
