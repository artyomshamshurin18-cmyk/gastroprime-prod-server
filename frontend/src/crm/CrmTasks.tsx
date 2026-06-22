import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, TASK_TYPES, TASK_PRIORITIES } from './types';

interface Task {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  user: { id: string; firstName: string; lastName: string };
  deal: { id: string; stage: string; company: { name: string } } | null;
  company: { id: string; name: string } | null;
  type: string;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function CrmTasks({ token }: Readonly<{ token: string; userRole?: string }>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('PENDING');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [deals, setDeals] = useState<{ id: string; company: { name: string } }[]>([]);
  const [managers, setManagers] = useState<{ id: string; firstName: string; lastName: string; role: string }[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', type: 'FOLLOW_UP', priority: 'NORMAL', dueDate: '',
    companyId: '', dealId: '', assignedTo: '',
  });
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadTasks(); loadCompanies(); loadDeals(); loadManagers(); }, [filter]);

  const loadTasks = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/crm/tasks?status=${filter}`, { headers });
      setTasks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadCompanies = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/companies?limit=500`, { headers });
      setCompanies(res.data.companies?.map((c: any) => ({ id: c.id, name: c.name })) || []);
    } catch (e) { /* skip */ }
  };

  const loadDeals = async () => {
    try {
      const res = await axios.get(`${API_URL}/crm/deals?limit=500`, { headers });
      const d = Array.isArray(res.data) ? res.data : res.data.deals || [];
      setDeals(d.map((deal: any) => ({ id: deal.id, company: { name: deal.company?.name || '?' } })));
    } catch (e) { /* skip */ }
  };

  const loadManagers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/users`, { headers });
      const users = (data.users || data || []).filter((u: any) =>
        ['ADMIN', 'SUPERADMIN', 'MANAGER', 'OPERATOR', 'CRM_OPERATOR'].includes(u.role)
      ).map((u: any) => ({ id: u.id, firstName: u.firstName || '', lastName: u.lastName || '', role: u.role }));
      setManagers(users);
    } catch (e) { /* skip */ }
  };

  const handleCreate = async () => {
    if (!form.title) return;
    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      };
      if (form.companyId) payload.companyId = form.companyId;
      if (form.dealId) payload.dealId = form.dealId;
      if (form.assignedTo) payload.assigneeId = form.assignedTo;

      await axios.post(`${API_URL}/crm/tasks`, payload, { headers });
      setShowForm(false);
      setForm({ title: '', description: '', type: 'FOLLOW_UP', priority: 'NORMAL', dueDate: '', companyId: '', dealId: '', assignedTo: '' });
      loadTasks();
    } catch (e) { console.error(e); }
  };

  const handleComplete = async (id: string) => {
    try {
      await axios.post(`${API_URL}/crm/tasks/${id}/complete`, {}, { headers });
      loadTasks();
    } catch (e) { console.error(e); }
  };

  const priorityColor = (p: string) => TASK_PRIORITIES.find(t => t.value === p)?.color || '#666';
  const typeLabel = (t: string) => TASK_TYPES.find(tp => tp.value === t)?.label || t;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📋 Задачи</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
            <option value="PENDING">Активные</option>
            <option value="COMPLETED">Завершённые</option>
            <option value="ALL">Все</option>
          </select>
          <button onClick={() => setShowForm(true)} style={{ padding: '6px 14px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Задача</button>
        </div>
      </div>

      {/* Task list */}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Загрузка...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => (
            <div key={task.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fff', borderRadius: 10, padding: '12px 16px', border: '1px solid #e9ecef',
              opacity: task.status === 'COMPLETED' ? 0.6 : 1,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                    {task.title}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: priorityColor(task.priority) + '20', color: priorityColor(task.priority), fontWeight: 600 }}>
                    {TASK_PRIORITIES.find(p => p.value === task.priority)?.label || task.priority}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#f0f0f0', color: '#666' }}>
                    {typeLabel(task.type)}
                  </span>
                  {task.status === 'COMPLETED' && (
                    <span style={{ fontSize: 11, color: '#28a745', fontWeight: 600 }}>✅ Выполнено</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#888', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {task.company && <span>🏢 {task.company.name}</span>}
                  {task.deal && <span>💼 {task.deal.company.name} ({task.deal.stage})</span>}
                  {task.dueDate && (
                    <span style={{ color: new Date(task.dueDate) < new Date() && task.status === 'PENDING' ? '#dc3545' : '#666' }}>
                      📅 {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                      {new Date(task.dueDate) < new Date() && task.status === 'PENDING' && ' ⚠️ Просрочено'}
                    </span>
                  )}
                  <span>👤 {task.user.firstName} {task.user.lastName}</span>
                  {task.description && <span style={{ color: '#aaa' }}>📝 {task.description}</span>}
                </div>
              </div>
              {task.status === 'PENDING' && (
                <button onClick={() => handleComplete(task.id)} style={{
                  background: '#28a745', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '6px 12px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 600,
                  marginLeft: 12,
                }}>
                  ✅ Готово
                </button>
              )}
            </div>
          ))}
          {tasks.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Нет задач</div>
          )}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 420, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>➕ Новая задача</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Название *</label>
                <input placeholder="Название задачи" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Описание</label>
                <textarea placeholder="Описание задачи" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Тип</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Приоритет</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Срок</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Компания</label>
                  <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value, dealId: '' }))} style={inputStyle}>
                    <option value="">Не привязана</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Сделка</label>
                  <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))} style={inputStyle}>
                    <option value="">Не привязана</option>
                    {deals.filter(d => !form.companyId || d.id === form.dealId).map(d => (
                      <option key={d.id} value={d.id}>{d.company.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Исполнитель</label>
                <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} style={inputStyle}>
                  <option value="">Себе</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                  ))}
                </select>
              </div>

              <button onClick={handleCreate} style={{ padding: '10px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>
                Создать задачу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
