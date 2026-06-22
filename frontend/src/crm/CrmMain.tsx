import { useState } from 'react';
import CrmLeads from './CrmLeads';
import CrmDealsKanban from './CrmDealsKanban';
import CrmTasks from './CrmTasks';
import CrmRoutes from './CrmRoutes';
import CrmDashboard from './CrmDashboard';
import CrmProjects from './CrmProjects';

interface CrmMainProps {
  token: string;
  userRole: string;
}

type CrmTab = 'leads' | 'deals' | 'tasks' | 'dashboard' | 'projects';

const TABS: { id: CrmTab; label: string; icon: string }[] = [
  { id: 'leads', label: 'Лиды', icon: '📋' },
  { id: 'deals', label: 'Воронка', icon: '📊' },
  { id: 'tasks', label: 'Задачи', icon: '✅' },
  { id: 'projects', label: 'Проекты', icon: '📁' },
  { id: 'dashboard', label: 'Дашборд', icon: '📈' },
];

const mobileNavStyle = {
  position: 'fixed' as const,
  bottom: 0,
  left: 0,
  right: 0,
  background: '#fff',
  borderTop: '1px solid #e9ecef',
  display: 'flex',
  justifyContent: 'space-around',
  padding: '6px 0 env(safe-area-inset-bottom, 6px)',
  zIndex: 1000,
  boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
};

const mobileTabStyle = (active: boolean) => ({
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: 1,
  padding: '4px 6px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  color: active ? '#0056b3' : '#888',
  fontSize: 10,
  fontWeight: active ? 600 : 400,
  flex: 1,
  minWidth: 0,
});

export default function CrmMain({ token, userRole }: CrmMainProps) {
  const [activeTab, setActiveTab] = useState<CrmTab>('leads');

  const renderContent = () => {
    switch (activeTab) {
      case 'leads': return <CrmLeads token={token} userRole={userRole} />;
      case 'deals': return <CrmDealsKanban token={token} userRole={userRole} />;
      case 'tasks': return <CrmTasks token={token} userRole={userRole} />;
      case 'projects': return <CrmProjects token={token} userRole={userRole} />;
      case 'dashboard': return <CrmDashboard token={token} />;
      default: return null;
    }
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Desktop tabs */}
      <div className="crm-desktop-tabs" style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e9ecef', paddingBottom: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 12px', border: 'none', background: activeTab === tab.id ? '#0056b3' : '#f5f5f5',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#fff' : '#555', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            <span style={{ fontSize: 12 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ minHeight: '50vh' }}>
        {renderContent()}
      </div>

      {/* Mobile bottom navigation */}
      <div className="crm-mobile-nav" style={mobileNavStyle}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={mobileTabStyle(activeTab === tab.id)}>
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Hide desktop tabs on mobile, hide mobile nav on desktop via injected style */}
      <style>{`
        @media (max-width: 768px) {
          .crm-desktop-tabs { display: none !important; }
          .crm-mobile-nav { display: flex !important; }
        }
        @media (min-width: 769px) {
          .crm-mobile-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
