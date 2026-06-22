import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, CRM_STAGES, DEAL_SOURCES } from './types';

interface LeadDeal {
  id: string;
  company: {
    id: string;
    name: string;
    contactPerson: string | null;
    address: string | null;
    workEmail: string | null;
    peopleCount: number | null;
    status: string;
  };
  managerId: string;
  manager: { id: string; email: string; firstName: string; lastName: string };
  stage: string;
  probability: number;
  estimatedAmount: number;
  minPrice?: number;
  maxPrice?: number;
  workDays?: number;
  source: string;
  notes: string | null;
  nextContactDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { logs: number };
}

interface DealLog {
  id: string;
  action: string;
  comment: string | null;
  oldValue: string | null;
  newValue: string | null;
  user: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface Manager {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function CrmLeads({ token, userRole }: { token: string; userRole: string }) {
  const [leads, setLeads] = useState<LeadDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDeal, setDetailDeal] = useState<LeadDeal | null>(null);
  const [detailLogs, setDetailLogs] = useState<DealLog[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<LeadDeal | null>(null);
  const [form, setForm] = useState<{companyName: string; deliveryAddress: string; contactPerson: string; phone: string; email: string; employeesCount: number; avgOrder: number; minPrice?: number; maxPrice?: number; workDays?: number; status: string; source: string; notes: string; managerId: string}>({
    companyName: '',
    deliveryAddress: '',
    contactPerson: '',
    phone: '',
    email: '',
    employeesCount: 0,
    avgOrder: 0,
    status: 'LEAD',
    source: 'COLD',
    notes: '',
    managerId: '',
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadLeads(); loadManagers(); }, [page, sourceFilter, searchQuery]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (sourceFilter !== 'ALL') params.source = sourceFilter;
      const { data } = await axios.get(`${API_URL}/crm/leads`, { headers, params });
      setLeads(data.deals || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadManagers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/users`, { headers });
      const users: Manager[] = (data.users || data || []).filter((u: any) =>
        u.role !== 'CLIENT'
      ).map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName || '', lastName: u.lastName || '', role: u.role }));
      setManagers(users);
    } catch (e) { console.error(e); }
  };

  const loadDealDetail = async (deal: LeadDeal) => {
    try {
      const [detailRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/crm/deals/${deal.id}`, { headers }),
        axios.get(`${API_URL}/crm/deals/${deal.id}/logs`, { headers }),
      ]);
      setDetailDeal(detailRes.data);
      setDetailLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (e) {
      setDetailDeal(deal);
      setDetailLogs([]);
    }
  };

  const handleCreate = async () => {
    if (!form.companyName.trim()) return;
    try {
      await axios.post(`${API_URL}/crm/leads`, {
        ...form,
        companyName: form.companyName.trim(),
        managerId: form.managerId || undefined,
      }, { headers });
      setShowForm(false);
      setForm({
        companyName: '', deliveryAddress: '', contactPerson: '', phone: '', email: '',
        employeesCount: 0, avgOrder: 0, minPrice: 0, maxPrice: 0, workDays: 5, status: 'LEAD', source: 'COLD', notes: '', managerId: '',
      });
      loadLeads();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (dealId: string, companyName: string) => {
    if (!confirm(`Удалить лид "${companyName}"? Это действие необратимо.`)) return;
    try {
      await axios.delete(`${API_URL}/crm/deals/${dealId}`, { headers });
      loadLeads();
      if (showDetailModal && detailDeal?.id === dealId) setShowDetailModal(false);
    } catch (e) {
      alert('Ошибка при удалении');
      console.error(e);
    }
  };

  const openDetail = async (deal: LeadDeal) => {
    setSelectedDeal(deal);
    await loadDealDetail(deal);
    setShowDetailModal(true);
  };

  const handleUpdateCompanyField = async (dealId: string, field: string, value: any) => {
    try {
      const res = await axios.patch(`${API_URL}/crm/deals/${dealId}/company`, { [field]: value }, { headers });
      if (detailDeal?.id === dealId) {
        setDetailDeal({ ...detailDeal, company: { ...(detailDeal as any).company, [field]: value } } as any);
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateField = async (dealId: string, field: string, value: any) => {
    try {
      await axios.patch(`${API_URL}/crm/deals/${dealId}`, { [field]: value }, { headers });
      loadLeads();
      if (detailDeal?.id === dealId) {
        setDetailDeal({ ...detailDeal, [field]: value } as any);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveAll = async () => {
    if (!detailDeal) return;
    const c = detailDeal.company || {};
    const q: any = {
      contactPerson: c.contactPerson || "",
      phone: c.phone || "",
      workEmail: c.workEmail || "",
      peopleCount: c.peopleCount || 0,
      address: c.address || "",
    };
    try {
      await axios.patch(`${API_URL}/crm/deals/${detailDeal.id}/company`, q, { headers });
      loadLeads();
    } catch (e) { console.error(e); }
  };

const getSourceLabel = (s: string) => DEAL_SOURCES.find(ds => ds.value === s)?.label || s;
  const getStageLabel = (s: string) => {
    const st = CRM_STAGES.find(cs => cs.value === s);
    return st ? st.label : s;
  };
  const getStageIcon = (s: string) => {
    const st = CRM_STAGES.find(cs => cs.value === s);
    return st ? st.icon : '📋';
  };
  const getStageColor = (s: string) => {
    const st = CRM_STAGES.find(cs => cs.value === s);
    return st ? st.color : '#6c757d';
  };
  const stageOrder = CRM_STAGES.map(s => s.value);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📋 Лиды</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              placeholder="Поиск компании или контакта..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadLeads()}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: 180 }}
            />
            <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
              <option value="ALL">Все источники</option>
              {DEAL_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {(userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MANAGER' || userRole === 'CRM_OPERATOR') && (
            <button onClick={() => setShowForm(true)} style={{
              padding: '8px 16px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600
            }}>+ Новый лид</button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div> : (
        <>
          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e9ecef', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                  <th style={thStyle}>Компания</th>
                  <th style={thStyle}>Контакты</th>
                  <th style={thStyle}>Источник</th>
                  <th style={thStyle}>Сумма</th>
                  <th style={thStyle}>Этап</th>
                  <th style={thStyle}>Менеджер</th>
                  <th style={thStyle}>Дата</th>
                  <th style={{ ...thStyle, width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }}
                    onClick={() => openDetail(lead)}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{lead.company.name}</div>
                    </td>
                    <td style={tdStyle}>
                      {lead.company.contactPerson && <div style={{ color: '#333' }}>{lead.company.contactPerson}</div>}
                      {lead.company.address && <div style={{ color: '#888', fontSize: 11 }}>{lead.company.address}</div>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f0f0f0', fontSize: 11 }}>
                        {getSourceLabel(lead.source)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600 }}>{lead.estimatedAmount.toLocaleString()} ₽</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#e8f4fd', fontSize: 11, color: '#0056b3' }}>
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: '#666' }}>{lead.manager.firstName} {lead.manager.lastName}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: '#888' }}>{new Date(lead.createdAt).toLocaleDateString('ru-RU')}</span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(lead.id, lead.company.name); }}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }} title="Удалить">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#999' }}>Нет лидов</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle}>← Назад</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: '#666' }}>{page} / {Math.ceil(total / 50)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} style={pageBtnStyle}>Вперед →</button>
            </div>
          )}
        </>
      )}

      {/* Create Lead Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 0' }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, minWidth: 420, maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>➕</span> Новый лид
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Название компании *</label>
                <input placeholder="ООО «Пример»" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Адрес доставки</label>
                <input placeholder="г. Москва, ул. Ленина, д. 1" value={form.deliveryAddress} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Контактное лицо</label>
                  <input placeholder="Иван Иванов" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Телефон</label>
                  <input placeholder="+7 (999) 123-45-67" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Email</label>
                <input placeholder="example@company.ru" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Сотрудников</label>
                  <input type="number" placeholder="0" value={form.employeesCount || ''} onChange={e => setForm(f => ({ ...f, employeesCount: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Средний заказ (₽)</label>
                  <input type="number" placeholder="0" value={form.avgOrder || ''} onChange={e => setForm(f => ({ ...f, avgOrder: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Мин. цена (₽)</label>
                  <input type="number" placeholder="0" value={form.minPrice || ''} onChange={e => setForm(f => ({ ...f, minPrice: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Макс. цена (₽)</label>
                  <input type="number" placeholder="0" value={form.maxPrice || ''} onChange={e => setForm(f => ({ ...f, maxPrice: parseInt(e.target.value) || 0 }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Раб. дней / нед</label>
                  <input type="number" placeholder="5" min="1" max="7" value={form.workDays || 5} onChange={e => setForm(f => ({ ...f, workDays: parseInt(e.target.value) || 5 }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Статус</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    <option value="LEAD">Лид</option>
                    <option value="ACTIVE">Активный</option>
                    <option value="PAUSE">Пауза</option>
                    <option value="CLOSED">Закрыт</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Источник</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inputStyle}>
                    {DEAL_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Ответственный менеджер</label>
                <select value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))} style={inputStyle}>
                  <option value="">Себе</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Комментарии</label>
                <textarea placeholder="Дополнительная информация..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
              </div>
              <button onClick={handleCreate} style={{
                padding: '12px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, cursor: 'pointer', fontWeight: 600, marginTop: 8
              }}>
                Создать лид
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Detail Modal */}
      {showDetailModal && detailDeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px 0' }}
          onClick={() => setShowDetailModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 480, maxWidth: 600, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                {getStageIcon(detailDeal.stage)} {detailDeal.company?.name}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (confirm(`Удалить лид "${detailDeal.company?.name}"?`)) { handleDelete(detailDeal.id, detailDeal.company?.name); } }}
                  style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
                  🗑️ Удалить
                </button>
                <button onClick={handleSaveAll}
                  style={{ background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  💾 Сохранить
                </button>
                <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
              </div>
            </div>

            {/* Stage selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Этап воронки</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {CRM_STAGES.map(s => {
                  const currentIdx = stageOrder.indexOf(detailDeal.stage);
                  const sIdx = stageOrder.indexOf(s.value);
                  const isActive = s.value === detailDeal.stage;
                  const isPast = sIdx <= currentIdx;
                  return (
                    <button key={s.value} onClick={() => handleUpdateField(detailDeal.id, 'stage', s.value)}
                      style={{
                        padding: '4px 10px', border: `1px solid ${s.color}`, borderRadius: 6,
                        background: isActive ? s.color : isPast ? s.color + '15' : '#fff',
                        color: isActive ? '#fff' : s.color, fontSize: 11, cursor: 'pointer',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {s.icon} {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deal Info */}
            {/* Company info - editable */}
            <div style={{ marginBottom: 16, background: '#f8f9fa', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>🏢 Данные компании</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Контактное лицо</div>
                  <input value={detailDeal.company?.contactPerson || ''} onChange={e => setDetailDeal({ ...detailDeal, company: { ...detailDeal.company, contactPerson: e.target.value } } as any)}
                    onBlur={(e) => handleUpdateCompanyField(detailDeal.id, 'contactPerson', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Телефон</div>
                  <input value={(detailDeal as any).company?.phone || ''} onChange={e => setDetailDeal({ ...detailDeal, company: { ...detailDeal.company, phone: e.target.value } } as any)}
                    onBlur={(e) => handleUpdateCompanyField(detailDeal.id, 'phone', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Email</div>
                  <input value={detailDeal.company?.workEmail || ''} onChange={e => setDetailDeal({ ...detailDeal, company: { ...detailDeal.company, workEmail: e.target.value } } as any)}
                    onBlur={(e) => handleUpdateCompanyField(detailDeal.id, 'workEmail', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Сотрудников</div>
                  <input type="number" value={detailDeal.company?.peopleCount || ''} onChange={e => setDetailDeal({ ...detailDeal, company: { ...detailDeal.company, peopleCount: parseInt(e.target.value) || 0 } } as any)}
                    onBlur={(e) => handleUpdateCompanyField(detailDeal.id, 'peopleCount', parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Адрес</div>
                  <input value={detailDeal.company?.address || ''} onChange={e => setDetailDeal({ ...detailDeal, company: { ...detailDeal.company, address: e.target.value } } as any)}
                    onBlur={(e) => handleUpdateCompanyField(detailDeal.id, 'address', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {/* Deal info fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <InfoField label="Сумма" value={`${detailDeal.estimatedAmount.toLocaleString()} ₽`} />
              <InfoField label="Вероятность" value={`${detailDeal.probability}%`} />
              <InfoField label="Источник" value={getSourceLabel(detailDeal.source)} />
              <div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Ответственный</div>
                <select value={detailDeal.managerId} onChange={e => { const val = e.target.value; handleUpdateField(detailDeal.id, "managerId", val); }}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 12 }}>
                  <option value="">— Не назначен —</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>
                  ))}
                </select>
              </div>
              <InfoField label="Дата создания" value={new Date(detailDeal.createdAt).toLocaleDateString('ru-RU')} />
              <InfoField label="Обновлено" value={new Date(detailDeal.updatedAt).toLocaleDateString('ru-RU')} />
              {detailDeal.nextContactDate && (
                <InfoField label="След. контакт" value={new Date(detailDeal.nextContactDate).toLocaleDateString('ru-RU')} />
              )}
            </div>

            {/* Pricing fields */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 11, color: "#666" }}>Мин. цена (₽): </label>
              <input type="number" value={detailDeal.minPrice || ''} onChange={e => handleUpdateField(detailDeal.id, 'minPrice', parseInt(e.target.value) || 0)} style={{ width: 100, fontSize: 12, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
              <label style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>Макс. цена (₽): </label>
              <input type="number" value={detailDeal.maxPrice || ''} onChange={e => handleUpdateField(detailDeal.id, 'maxPrice', parseInt(e.target.value) || 0)} style={{ width: 100, fontSize: 12, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
              <label style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>Раб. дней: </label>
              <input type="number" min="1" max="7" value={detailDeal.workDays || 5} onChange={e => handleUpdateField(detailDeal.id, 'workDays', parseInt(e.target.value) || 5)} style={{ width: 60, fontSize: 12, padding: 6, borderRadius: 6, border: '1px solid #ddd' }} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Заметки</label>
              <textarea value={detailDeal.notes || ''} onChange={e => setDetailDeal({ ...detailDeal, notes: e.target.value } as any)}
                onBlur={(e) => { if (e.target.value !== (selectedDeal?.notes || '')) handleUpdateField(detailDeal.id, 'notes', e.target.value); }}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
            </div>

            {/* Next Contact Date */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Дата следующего контакта</label>
              <input type="date" value={detailDeal.nextContactDate?.slice(0, 10) || ''}
                onChange={e => { const val = e.target.value || null; handleUpdateField(detailDeal.id, 'nextContactDate', val); setDetailDeal({ ...detailDeal, nextContactDate: val } as any); }}
                style={inputStyle} />
            </div>

            {/* Logs */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>📜 История изменений ({detailLogs.length})</label>
              {detailLogs.length === 0 ? (
                <div style={{ fontSize: 13, color: '#aaa', padding: 8 }}>Нет записей</div>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailLogs.map(log => (
                    <div key={log.id} style={{ padding: '8px 10px', background: '#f8f9fa', borderRadius: 8, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}>
                        <span>{log.user?.firstName} {log.user?.lastName}</span>
                        <span>{new Date(log.createdAt).toLocaleString('ru-RU')}</span>
                      </div>
                      {log.comment && <div style={{ color: '#333' }}>{log.comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const thStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'middle',
};

const pageBtnStyle: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13,
};
