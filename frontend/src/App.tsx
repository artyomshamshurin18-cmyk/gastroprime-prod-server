import { useState, useEffect } from 'react'
import axios from 'axios'
import './theme.css'
import AdminAnalytics from './AdminAnalytics'
import AdminBillingInvoices from './AdminBillingInvoices'
import AdminCategories from './AdminCategories'
import AdminCompanies from './AdminCompanies'
import AdminDishes from './AdminDishes'
import AdminInternalTeam from './AdminInternalTeam'
import AdminKitchenSummary from './AdminKitchenSummary'
import AdminMenuPlanning from './AdminMenuPlanning'
import AdminReconciliation from './AdminReconciliation'
import AdminWeeklyMenus from './AdminWeeklyMenus'
import AdminLogistics from './AdminLogistics'
import CrmMain from './crm/CrmMain'
import CrmOperatorDashboard from './CrmOperatorDashboard'
import CompanyAnalytics from './CompanyAnalytics'
import ClientCompanyDashboard from './ClientCompanyDashboard'
import ClientCompanyRequests from './ClientCompanyRequests'
import ClientInvoices from './ClientInvoices'
import AdminUsers from './AdminUsers'
import ClientManagerChat from './ClientManagerChat'
import ClientProfile from './ClientProfile'
import DriverDashboard from './DriverDashboard'
import GuestInviteChat from './GuestInviteChat'
import HelpCenter from './HelpCenter'
import ManagerBoard from './ManagerBoard'
import PortalLoginExperience from './PortalLoginExperience'
import WeeklyMenuSelector from './WeeklyMenuSelector'
import { API_URL, MEDIA_URL } from './api-config';

const BRAND_LOGO_URL = 'https://static.tildacdn.com/tild6666-3335-4136-b866-376266373637/Group.svg'
const companyStatusLabels: Record<string, string> = {
  ONBOARDING: 'Подключение',
  ACTIVE: 'В работе',
  ON_HOLD: 'На стопе',
  TERMINATED: 'Доступ закрыт',
}

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

function InstallAppHint() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((window.navigator as any).standalone)
    setInstalled(isStandalone)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as DeferredInstallPrompt)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  const installApp = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (isIos) {
    return (
      <div className="gp-install-card">
        <strong>Установить на iPhone</strong>
        <div style={{ color: '#6f6a64', marginTop: 6 }}>Откройте меню Поделиться в Safari и выберите «На экран Домой».</div>
      </div>
    )
  }

  if (!deferredPrompt) return null

  return (
    <div className="gp-install-card">
      <div>
        <strong>Установить как приложение</strong>
        <div style={{ color: '#6f6a64', marginTop: 6 }}>Можно добавить кабинет на главный экран Android как ярлык-приложение.</div>
      </div>
      <button onClick={installApp} style={{ background: 'linear-gradient(135deg, #ed3915 0%, #ff6a3d 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px' }}>Добавить на экран</button>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    console.log('Login clicked', email)
    if (!email || !password) {
      setError('Введите email и пароль')
      return
    }
    setError('')
    setLoading(true)
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password })
      console.log('Response:', response.data)
      const token = response.data.access_token || response.data.token
      const user = response.data.user
      if (!token || !user) {
        setError('Ошибка: нет данных пользователя')
        return
      }
      onLogin(token, user)
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.response?.data?.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (data: { companyName: string; firstName: string; phone: string }) => {
    if (!email || !password) {
      setError("Введите email и пароль")
      return
    }
    if (!data.companyName) {
      setError("Введите название компании")
      return
    }
    setError("")
    setLoading(true)
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, { email, password, ...data })
      const token = response.data.access_token || response.data.token
      const user = response.data.user
      if (!token || !user) {
        setError("Ошибка: не удалось создать компанию")
        return
      }
      onLogin(token, user)
    } catch (err: any) {
      setError(err.response?.data?.message || "Ошибка регистрации")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PortalLoginExperience
      brandLogoUrl={BRAND_LOGO_URL}
      email={email}
      password={password}
      error={error}
      loading={loading}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onLogin={handleLogin}
      onRegister={handleRegister}
    />
  )
}

function ClientDashboard({ user, token, onLogout, onUserUpdate, impersonatorUser, onRestoreSession }: { user: any, token: string, onLogout: () => void, onUserUpdate: (user: any) => void, impersonatorUser?: any, onRestoreSession?: () => void }) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'requests' | 'planning' | 'profile' | 'company' | 'invoices' | 'chat' | 'help'>('planning')
  const canManageCompany = user?.role === 'MASTER_CLIENT' || user?.company?.userId === user?.id

  const refreshCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      onUserUpdate(response.data)
    } catch (error) {
      console.error('Не удалось обновить пользователя', error)
    }
  }

  const companyStatus = user?.company?.status || 'ACTIVE'
  const visibleTabs = [
    ...(companyStatus === 'ACTIVE' ? (['planning', 'requests'] as const) : []),
    ...(canManageCompany && ['ACTIVE', 'ONBOARDING'].includes(companyStatus) ? (['company'] as const) : []),
    ...(canManageCompany && companyStatus === 'ACTIVE' ? (['analytics'] as const) : []),
    ...(['ACTIVE', 'ON_HOLD'].includes(companyStatus) ? (['invoices'] as const) : []),
    ...(['ONBOARDING', 'ACTIVE', 'ON_HOLD'].includes(companyStatus) ? (['chat'] as const) : []),
    'profile' as const,
    'help' as const,
  ]

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0])
    }
  }, [activeTab, companyStatus, canManageCompany])

  return (
    <div className="gp-shell">
      <div className="gp-header">
        <div className="gp-brand">
          <img src={BRAND_LOGO_URL} alt="Gastroprime" />
          <div>
            <div className="gp-brand-subtitle">Кабинет клиента</div>
          </div>
        </div>
        <div className="gp-header-right">
          {user?.company?.logoUrl && <span className="gp-top-pill" style={{ padding: 6 }}><img src={MEDIA_URL(user.company.logoUrl)} alt="Лого компании" style={{ height: 32, width: 'auto', display: 'block' }} /></span>}
          <span className="gp-top-pill" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.avatarUrl && <img src={MEDIA_URL(user.avatarUrl)} alt="Аватар" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
            <span>Привет, {user?.firstName || user?.email}!</span>
          </span>
          <span className="gp-top-pill">Статус компании: {companyStatusLabels[companyStatus] || companyStatus}</span>
          <span className="gp-top-pill gp-top-pill--accent">Баланс: {user?.company?.balance ?? 0} ₽</span>
          <span className="gp-top-pill">Лимит/день: {user?.company?.dailyLimit ?? 0} ₽</span>
          <button onClick={() => setActiveTab('help')} style={{ padding: '10px 16px', background: '#fff3eb', color: '#b63d1c', border: '1px solid rgba(237,57,21,0.18)', borderRadius: 12, fontWeight: 700 }}>📘 Инструкция</button>
          <button onClick={onLogout} style={{ padding: '10px 16px', background: '#1c1a18', color: 'white', border: 'none', borderRadius: 12 }}>Выйти</button>
        </div>
      </div>
      <div className="gp-tabs gp-tabs--client">
        {companyStatus === 'ACTIVE' && <div onClick={() => setActiveTab('planning')} className={`gp-tab ${activeTab === 'planning' ? 'gp-tab--active' : ''}`}>📅 Плановое меню</div>}
        {companyStatus === 'ACTIVE' && <div onClick={() => setActiveTab('requests')} className={`gp-tab ${activeTab === 'requests' ? 'gp-tab--active' : ''}`}>📋 Запланированные заявки</div>}
        {canManageCompany && ['ACTIVE', 'ONBOARDING'].includes(companyStatus) && <div onClick={() => setActiveTab('company')} className={`gp-tab ${activeTab === 'company' ? 'gp-tab--active' : ''}`}>🏢 Компания</div>}
        {canManageCompany && companyStatus === 'ACTIVE' && <div onClick={() => setActiveTab('analytics')} className={`gp-tab ${activeTab === 'analytics' ? 'gp-tab--active' : ''}`}>📊 Аналитика</div>}
        {['ACTIVE', 'ON_HOLD'].includes(companyStatus) && <div onClick={() => setActiveTab('invoices')} className={`gp-tab ${activeTab === 'invoices' ? 'gp-tab--active' : ''}`}>💳 Счета и сверка</div>}
        {['ONBOARDING', 'ACTIVE', 'ON_HOLD'].includes(companyStatus) && <div onClick={() => setActiveTab('chat')} className={`gp-tab ${activeTab === 'chat' ? 'gp-tab--active' : ''}`}>💬 Менеджер</div>}
        <div onClick={() => setActiveTab('profile')} className={`gp-tab ${activeTab === 'profile' ? 'gp-tab--active' : ''}`}>👤 Профиль</div>
        <div onClick={() => setActiveTab('help')} className={`gp-tab ${activeTab === 'help' ? 'gp-tab--active' : ''}`}>📘 Инструкция</div>
      </div>
      <div className="gp-content">
        <InstallAppHint />
        {impersonatorUser && onRestoreSession && (
          <div className="gp-soft-block" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              Вы в кабинете клиента от имени менеджера <strong>{impersonatorUser.firstName || impersonatorUser.email}</strong>.
            </div>
            <button onClick={onRestoreSession} style={{ padding: '10px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 10 }}>Вернуться в кабинет менеджера</button>
          </div>
        )}
        {companyStatus === 'ONBOARDING' && <div className="gp-soft-block" style={{ marginBottom: 16 }}>Компания в статусе подключения. Сейчас открыт ограниченный режим, в первую очередь для добавления сотрудников.</div>}
        {companyStatus === 'ON_HOLD' && <div className="gp-soft-block" style={{ marginBottom: 16 }}>Компания находится на стопе. Доступны только счета и сверка.</div>}
        {activeTab === 'planning' && (
          <WeeklyMenuSelector token={token} mode="planning" />
        )}
        {activeTab === 'requests' && (canManageCompany ? <ClientCompanyRequests token={token} /> : <WeeklyMenuSelector token={token} mode="requests" />)}
        {activeTab === 'company' && canManageCompany && <ClientCompanyDashboard token={token} onUserUpdate={onUserUpdate} />}
        {activeTab === 'analytics' && canManageCompany && <CompanyAnalytics token={token} />}
        {activeTab === 'invoices' && <ClientInvoices token={token} onUserRefresh={refreshCurrentUser} />}
        {activeTab === 'chat' && <ClientManagerChat token={token} user={user} />}
        {activeTab === 'profile' && <ClientProfile token={token} user={user} onUserUpdate={onUserUpdate} />}
        {activeTab === 'help' && <HelpCenter role={canManageCompany ? 'coordinator' : 'employee'} />}
      </div>
      <div className="gp-mobile-nav">
        {companyStatus === 'ACTIVE' && <button className={`gp-mobile-nav__item ${activeTab === 'planning' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('planning')}><span>📅</span><span>Меню</span></button>}
        {companyStatus === 'ACTIVE' && <button className={`gp-mobile-nav__item ${activeTab === 'requests' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('requests')}><span>📋</span><span>Заявки</span></button>}
        {canManageCompany && ['ACTIVE', 'ONBOARDING'].includes(companyStatus) && <button className={`gp-mobile-nav__item ${activeTab === 'company' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('company')}><span>🏢</span><span>Компания</span></button>}
        {canManageCompany && companyStatus === 'ACTIVE' && <button className={`gp-mobile-nav__item ${activeTab === 'analytics' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('analytics')}><span>📊</span><span>Аналитика</span></button>}
        {['ACTIVE', 'ON_HOLD'].includes(companyStatus) && <button className={`gp-mobile-nav__item ${activeTab === 'invoices' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('invoices')}><span>💳</span><span>Счета</span></button>}
        {['ONBOARDING', 'ACTIVE', 'ON_HOLD'].includes(companyStatus) && <button className={`gp-mobile-nav__item ${activeTab === 'chat' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('chat')}><span>💬</span><span>Менеджер</span></button>}
        <button className={`gp-mobile-nav__item ${activeTab === 'profile' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('profile')}><span>👤</span><span>Профиль</span></button>
        <button className={`gp-mobile-nav__item ${activeTab === 'help' ? 'gp-mobile-nav__item--active' : ''}`} onClick={() => setActiveTab('help')}><span>📘</span><span>Инструкция</span></button>
      </div>
    </div>
  )
}

function AdminDashboard({ user, token, onLogout }: { user: any, token: string, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'companies' | 'team' | 'reconciliation' | 'invoices' | 'categories' | 'dishes' | 'users' | 'planning' | 'client-plans' | 'crm' | 'logistics' | 'kitchen'>('analytics')
  return (
    <div className="gp-shell">
      <div className="gp-header">
        <div className="gp-brand">
          <img src={BRAND_LOGO_URL} alt="Gastroprime" />
          <div>
            <div className="gp-brand-subtitle">Административная панель</div>
          </div>
        </div>
        <div className="gp-header-right"><span className="gp-top-pill">{user?.email}</span><button onClick={onLogout} style={{ padding: '10px 16px', background: '#1c1a18', color: 'white', border: 'none', borderRadius: 12 }}>Выйти</button></div>
      </div>
      <div className="gp-tabs">
        <div onClick={() => setActiveTab('analytics')} className={`gp-tab ${activeTab === 'analytics' ? 'gp-tab--active' : ''}`}>📊 Аналитика</div>
        <div onClick={() => setActiveTab('companies')} className={`gp-tab ${activeTab === 'companies' ? 'gp-tab--active' : ''}`}>🏢 Компании</div>
        <div onClick={() => setActiveTab('team')} className={`gp-tab ${activeTab === 'team' ? 'gp-tab--active' : ''}`}>🧑‍💼 Команда GP</div>
        <div onClick={() => setActiveTab('reconciliation')} className={`gp-tab ${activeTab === 'reconciliation' ? 'gp-tab--active' : ''}`}>🧾 Сверка</div>
        <div onClick={() => setActiveTab('invoices')} className={`gp-tab ${activeTab === 'invoices' ? 'gp-tab--active' : ''}`}>💰 Счета</div>
        <div onClick={() => setActiveTab('categories')} className={`gp-tab ${activeTab === 'categories' ? 'gp-tab--active' : ''}`}>🗂️ Категории</div>
        <div onClick={() => setActiveTab('dishes')} className={`gp-tab ${activeTab === 'dishes' ? 'gp-tab--active' : ''}`}>🍳 Блюда</div>
        <div onClick={() => setActiveTab('users')} className={`gp-tab ${activeTab === 'users' ? 'gp-tab--active' : ''}`}>👥 Пользователи</div>
        <div onClick={() => setActiveTab('planning')} className={`gp-tab ${activeTab === 'planning' ? 'gp-tab--active' : ''}`}>📅 Планирование</div>
        <div onClick={() => setActiveTab('client-plans')} className={`gp-tab ${activeTab === 'client-plans' ? 'gp-tab--active' : ''}`}>📋 Заявки</div>
        <div onClick={() => setActiveTab('crm')} className={`gp-tab ${activeTab === 'crm' ? 'gp-tab--active' : ''}`}>📋 CRM</div>
        <div onClick={() => setActiveTab('logistics')} className={`gp-tab ${activeTab === 'logistics' ? 'gp-tab--active' : ''}`}>🚚 Логистика</div>
        <div onClick={() => setActiveTab('kitchen')} className={`gp-tab ${activeTab === 'kitchen' ? 'gp-tab--active' : ''}`}>🍲 Сводка</div>
        <div onClick={() => setActiveTab('crm')} className={`gp-tab ${activeTab === 'crm' ? 'gp-tab--active' : ''}`}>📋 CRM</div>
      </div>
      <div className="gp-content">
        {activeTab === 'analytics' && <AdminAnalytics token={token} />}
        {activeTab === 'companies' && <AdminCompanies token={token} />}
        {activeTab === 'team' && <AdminInternalTeam token={token} />}
        {activeTab === 'reconciliation' && <AdminReconciliation token={token} />}
        {activeTab === 'invoices' && <AdminBillingInvoices token={token} />}
        {activeTab === 'categories' && <AdminCategories token={token} />}
        {activeTab === 'dishes' && <AdminDishes token={token} />}
        {activeTab === 'users' && <AdminUsers token={token} currentUser={user} />}
        {activeTab === 'planning' && <AdminMenuPlanning token={token} />}
        {activeTab === 'client-plans' && <AdminWeeklyMenus token={token} />}
        {activeTab === 'crm' && <CrmMain token={token} userRole={user?.role} />}
        {activeTab === 'logistics' && <AdminLogistics token={token} />}
        {activeTab === 'kitchen' && <AdminKitchenSummary token={token} />}
      </div>
    </div>
  )
}

function ManagerDashboard({ user, token, onLogout, onImpersonate }: { user: any, token: string, onLogout: () => void, onImpersonate: (token: string, user: any) => void }) {
  const [activeTab, setActiveTab] = useState<'clients' | 'client-plans' | 'planning' | 'companies' | 'users' | 'analytics' | 'reconciliation' | 'invoices' | 'categories' | 'dishes' | 'kitchen' | 'crm' | 'help'>('clients')

  return (
    <div className="gp-shell">
      <div className="gp-header">
        <div className="gp-brand">
          <img src={BRAND_LOGO_URL} alt="Gastroprime" />
          <div>
            <div className="gp-brand-subtitle">Панель менеджера</div>
          </div>
        </div>
        <div className="gp-header-right"><span className="gp-top-pill">{user?.email}</span><button onClick={() => setActiveTab('help')} style={{ padding: '10px 16px', background: '#fff3eb', color: '#b63d1c', border: '1px solid rgba(237,57,21,0.18)', borderRadius: 12, fontWeight: 700 }}>📘 Инструкция</button><button onClick={onLogout} style={{ padding: '10px 16px', background: '#1c1a18', color: 'white', border: 'none', borderRadius: 12 }}>Выйти</button></div>
      </div>
      <div className="gp-tabs">
        <div onClick={() => setActiveTab('clients')} className={`gp-tab ${activeTab === 'clients' ? 'gp-tab--active' : ''}`}>🗂️ Клиенты</div>
        <div onClick={() => setActiveTab('client-plans')} className={`gp-tab ${activeTab === 'client-plans' ? 'gp-tab--active' : ''}`}>📋 Заявки</div>
        <div onClick={() => setActiveTab('planning')} className={`gp-tab ${activeTab === 'planning' ? 'gp-tab--active' : ''}`}>📅 Планирование</div>
        <div onClick={() => setActiveTab('companies')} className={`gp-tab ${activeTab === 'companies' ? 'gp-tab--active' : ''}`}>🏢 Компании</div>
        <div onClick={() => setActiveTab('users')} className={`gp-tab ${activeTab === 'users' ? 'gp-tab--active' : ''}`}>👥 Пользователи</div>
        <div onClick={() => setActiveTab('analytics')} className={`gp-tab ${activeTab === 'analytics' ? 'gp-tab--active' : ''}`}>📊 Аналитика</div>
        <div onClick={() => setActiveTab('reconciliation')} className={`gp-tab ${activeTab === 'reconciliation' ? 'gp-tab--active' : ''}`}>🧾 Сверка</div>
        <div onClick={() => setActiveTab('invoices')} className={`gp-tab ${activeTab === 'invoices' ? 'gp-tab--active' : ''}`}>💰 Счета</div>
        <div onClick={() => setActiveTab('categories')} className={`gp-tab ${activeTab === 'categories' ? 'gp-tab--active' : ''}`}>🗂️ Категории</div>
        <div onClick={() => setActiveTab('dishes')} className={`gp-tab ${activeTab === 'dishes' ? 'gp-tab--active' : ''}`}>🍳 Блюда</div>
        <div onClick={() => setActiveTab('kitchen')} className={`gp-tab ${activeTab === 'kitchen' ? 'gp-tab--active' : ''}`}>🍲 Сводка</div>
        <div onClick={() => setActiveTab('crm')} className={`gp-tab ${activeTab === 'crm' ? 'gp-tab--active' : ''}`}>📋 CRM</div>
        <div onClick={() => setActiveTab('help')} className={`gp-tab ${activeTab === 'help' ? 'gp-tab--active' : ''}`}>📘 Инструкция</div>
      </div>
      <div className="gp-content">
        {activeTab === 'clients' && <ManagerBoard token={token} onImpersonate={onImpersonate} />}
        {activeTab === 'client-plans' && <AdminWeeklyMenus token={token} />}
        {activeTab === 'planning' && <AdminMenuPlanning token={token} />}
        {activeTab === 'companies' && <AdminCompanies token={token} />}
        {activeTab === 'users' && <AdminUsers token={token} currentUser={user} />}
        {activeTab === 'analytics' && <AdminAnalytics token={token} />}
        {activeTab === 'reconciliation' && <AdminReconciliation token={token} />}
        {activeTab === 'invoices' && <AdminBillingInvoices token={token} />}
        {activeTab === 'categories' && <AdminCategories token={token} />}
        {activeTab === 'dishes' && <AdminDishes token={token} />}
        {activeTab === 'crm' && <CrmMain token={token} userRole={user?.role} />}
        {activeTab === 'logistics' && <AdminLogistics token={token} />}
        {activeTab === 'kitchen' && <AdminKitchenSummary token={token} />}
        {activeTab === 'help' && <HelpCenter role="manager" />}
      </div>
    </div>
  )
}

function App() {
  const inviteMatch = window.location.pathname.match(/^\/chat\/invite\/([^/]+)$/)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<any>(null)
  const [impersonatorUser, setImpersonatorUser] = useState<any>(null)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      try { setUser(JSON.parse(u)) } catch (e) { localStorage.removeItem('user') }
    }

    const impersonator = localStorage.getItem('impersonatorUser')
    if (impersonator) {
      try { setImpersonatorUser(JSON.parse(impersonator)) } catch (e) { localStorage.removeItem('impersonatorUser') }
    }
  }, [])

  const handleLogin = (t: string, u: any) => {
    console.log('Login:', u)
    localStorage.removeItem('impersonatorToken')
    localStorage.removeItem('impersonatorUser')
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    setImpersonatorUser(null)
    setToken(t)
    setUser(u)
  }

  const handleUserUpdate = (u: any) => {
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const handleImpersonate = (nextToken: string, nextUser: any) => {
    if (!localStorage.getItem('impersonatorToken') && token && user) {
      localStorage.setItem('impersonatorToken', token)
      localStorage.setItem('impersonatorUser', JSON.stringify(user))
      setImpersonatorUser(user)
    }

    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }

  const handleRestoreSession = () => {
    const originalToken = localStorage.getItem('impersonatorToken')
    const originalUser = localStorage.getItem('impersonatorUser')
    if (!originalToken || !originalUser) return

    localStorage.setItem('token', originalToken)
    localStorage.setItem('user', originalUser)
    localStorage.removeItem('impersonatorToken')
    localStorage.removeItem('impersonatorUser')
    setToken(originalToken)
    setUser(JSON.parse(originalUser))
    setImpersonatorUser(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('impersonatorToken')
    localStorage.removeItem('impersonatorUser')
    setImpersonatorUser(null)
    setToken(null)
    setUser(null)
  }

  if (inviteMatch?.[1]) return <GuestInviteChat inviteToken={decodeURIComponent(inviteMatch[1])} />
  if (!token || !user) return <Login onLogin={handleLogin} />
  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') return <AdminDashboard user={user} token={token} onLogout={handleLogout} />
  if (user.role === 'MANAGER') return <ManagerDashboard user={user} token={token} onLogout={handleLogout} onImpersonate={handleImpersonate} />
  if (user.role === 'DRIVER') return <DriverDashboard user={user} token={token} onLogout={handleLogout} />
  if (user.role === 'CRM_OPERATOR') return <CrmOperatorDashboard user={user} token={token} onLogout={handleLogout} />
  return <ClientDashboard user={user} token={token} onLogout={handleLogout} onUserUpdate={handleUserUpdate} impersonatorUser={impersonatorUser} onRestoreSession={handleRestoreSession} />
}

export default App
