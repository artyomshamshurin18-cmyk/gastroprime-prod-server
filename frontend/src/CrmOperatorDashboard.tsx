import { useState } from 'react'
import axios from 'axios'
import CrmMain from './crm/CrmMain'

interface Props {
  user: any
  token: string
  onLogout: () => void
}

export default function CrmOperatorDashboard({ user, token, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('crm')

  return (
    <div className="gp-app">
      <header className="gp-header">
        <div className="gp-header-title">
          <a href="https://gastroprime.ru" className="gp-logo-link">
            <img src="/logo.svg" alt="Gastroprime" className="gp-logo" />
          </a>
          <span className="gp-header-role">CRM Оператор</span>
        </div>
        <div className="gp-header-user">
          <span className="gp-header-username">{user.name || user.email}</span>
          <button onClick={onLogout} className="gp-btn gp-btn--small gp-btn--danger">Выйти</button>
        </div>
      </header>
      <div className="gp-tabs">
        <div
          onClick={() => setActiveTab('crm')}
          className={`gp-tab ${activeTab === 'crm' ? 'gp-tab--active' : ''}`}
        >
          📋 CRM
        </div>
      </div>
      <div className="gp-content">
        {activeTab === 'crm' && <CrmMain token={token} userRole={user?.role} user={user} />}
      </div>
    </div>
  )
}
