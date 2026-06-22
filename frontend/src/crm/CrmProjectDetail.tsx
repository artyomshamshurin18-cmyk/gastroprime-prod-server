// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, PROJECT_STATUSES, BOARD_STATUSES, TASK_PRIORITIES, parseLabels } from './types';
import CrmTaskCard from './CrmTaskCard';
import CrmProjectChat from './CrmProjectChat';
import CrmProjectFiles from './CrmProjectFiles';

interface CrmProject {
  id: string;
  name: string;
  description?: string;
  companyId?: string;
  dealId?: string;
  status: string;
  color?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
  members?: CrmProjectMember[];
  tasks?: CrmTask[];
  _count?: { tasks: number; members: number };
}

interface CrmProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

interface CrmTask {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  priority?: string;
  dueDate?: string;
  boardStatus?: string;
  status?: string;
  createdAt: string;
  labels?: any;
  _count?: { comments?: number; attachments?: number; subtasks?: number };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

const COLOR_PALETTE = ['#ed3915', '#0d6efd', '#28a745', '#fd7e14', '#6f42c1', '#e83e8c', '#20c997', '#ffc107', '#17a2b8', '#6c757d'];

export default function CrmProjectDetail({ token, projectId, onBack, onUpdate }: {
  token: string;
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
}) {
  const [project, setProject] = useState<CrmProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'ACTIVE', color: '#0d6efd', endDate: '' });
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', userId: '', priority: 'NORMAL', dueDate: '',
  });
  const [selectedTask, setSelectedTask] = useState<CrmTask | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'chat' | 'files'>('board');

  const headers = { Authorization: `Bearer ${token}` };

  const loadProject = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/crm/projects/${projectId}`, { headers });
      setProject(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/users`, { headers });
      const users: User[] = (data.users || data || []).map((u: any) => ({
        id: u.id, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', role: u.role,
      }));
      setEmployees(users.filter(u => u.role !== 'CLIENT'));
    } catch (e) { /* skip */ }
  }, []);

  useEffect(() => { loadProject(); loadUsers(); }, [loadProject, loadUsers]);

  const handleEdit = async () => {
    try {
      const payload: any = { ...editForm };
      if (editForm.endDate) {
        payload.endDate = editForm.endDate;
      } else {
        payload.endDate = null; // clear end date
      }
      await axios.patch(`${API_URL}/crm/projects/${projectId}`, payload, { headers });
      setShowEdit(false);
      loadProject();
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const handleArchive = async () => {
    try {
      await axios.patch(`${API_URL}/crm/projects/${projectId}/archive`, {}, { headers });
      loadProject();
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const handleComplete = async () => {
    try {
      await axios.patch(`${API_URL}/crm/projects/${projectId}/complete`, {}, { headers });
      loadProject();
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const openEdit = () => {
    if (!project) return;
    const endDate = project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '';
    setEditForm({ name: project.name, description: project.description || '', status: project.status, color: project.color || '#0d6efd', endDate });
    setShowEdit(true);
  };
const handleRestore = async () => {
    try {
      await axios.patch(`${API_URL}/crm/projects/${projectId}/restore`, {}, { headers });
      loadProject();
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить проект? Все задачи и данные будут безвозвратно удалены.")) return;
    try {
      await axios.delete(`${API_URL}/crm/projects/${projectId}`, { headers });
      onBack();
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await axios.post(`${API_URL}/crm/projects/${projectId}/members`, { userId, role: 'MEMBER' }, { headers });
      loadProject();
    } catch (e) { console.error(e); }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await axios.delete(`${API_URL}/crm/projects/${projectId}/members/${memberId}`, { headers });
      loadProject();
    } catch (e) { console.error(e); }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    try {
      const payload: any = { title: taskForm.title, projectId };
      if (taskForm.description) payload.description = taskForm.description;
      if (taskForm.userId) payload.userId = taskForm.userId;
      if (taskForm.priority) payload.priority = taskForm.priority;
      if (taskForm.dueDate) payload.dueDate = taskForm.dueDate;
      await axios.post(`${API_URL}/crm/tasks`, payload, { headers });
      setShowCreateTask(false);
      setTaskForm({ title: '', description: '', userId: '', priority: 'NORMAL', dueDate: '' });
      loadProject();
    } catch (e) { console.error(e); }
  };

  const handleBoardMove = async (taskId: string, newStatus: string) => {
    try {
      await axios.patch(`${API_URL}/crm/tasks/${taskId}`, { boardStatus: newStatus }, { headers });
      setDraggedTask(null);
      loadProject();
    } catch (e) { console.error(e); }
  };

  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDrop = async (boardStatus: string) => {
    if (draggedTask) {
      await handleBoardMove(draggedTask, boardStatus);
    }
  };

  const openTaskDetail = (task: CrmTask) => {
    setSelectedTask(task);
  };

  const st = (s?: string) => PROJECT_STATUSES.find(p => p.value === s) || { value: s || '', label: s || '', color: '#6c757d', icon: '' };

  const membersInProject = project?.members || [];
  const currentMemberIds = new Set(membersInProject.filter(m => m.user).map(m => m.user!.id));
  const availableEmployees = employees.filter(u => !currentMemberIds.has(u.id));

  // End date calculation
  const getEndDateDisplay = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    return {
      endDateStr: end.toLocaleDateString('ru-RU'),
      diffDays: Math.abs(diffDays),
      isOverdue,
    };
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Загрузка проекта...</div>;
  if (!project) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Проект не найден</div>;

  const boardTasks: Record<string, CrmTask[]> = {};
  BOARD_STATUSES.forEach(b => { boardTasks[b.value] = []; });
  (project.tasks || []).forEach(task => {
    const bs = task.boardStatus || 'TODO';
    if (boardTasks[bs]) boardTasks[bs].push(task);
    else boardTasks['TODO'].push(task);
  });

  const endDateDisplay = getEndDateDisplay(project.endDate);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Назад к проектам
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', background: project.color || '#0d6efd',
              flexShrink: 0,
            }} />
            <h2 style={{ margin: 0, fontSize: 22 }}>{project.name}</h2>
            <span style={{
              fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
              background: st(project.status).color + '18', color: st(project.status).color,
              border: `1px solid ${st(project.status).color}40`,
            }}>
              {st(project.status).icon} {st(project.status).label}
            </span>
            <span style={{ fontSize: 13, color: '#888' }}>
              ✅ {project._count?.tasks ?? project.tasks?.length ?? 0} задач · 👥 {project._count?.members ?? membersInProject.length} участников
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={openEdit}
              style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              ✏️ Редактировать
            </button>
            <button onClick={() => setShowMembers(true)}
              style={{ padding: '6px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              👥 Участники
            </button>
            {project.status === 'ACTIVE' && (
              <>
                <button onClick={handleComplete}
                  style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  🏁 Завершить
                </button>
                <button onClick={handleArchive}
                  style={{ padding: '6px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  📦 Архивировать
                </button>
              </>
            )}
            {project.status === 'COMPLETED' && (
              <>
                <button onClick={handleRestore}
                  style={{ padding: '6px 12px', background: '#ffc107', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ♻️ Восстановить
                </button>
                <button onClick={handleDelete}
                  style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  🗑️ Удалить
                </button>
              </>
            )}
            {project.status === 'ARCHIVED' && (
              <>
                <button onClick={handleRestore}
                  style={{ padding: '6px 12px', background: '#ffc107', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ♻️ Восстановить
                </button>
                <button onClick={handleDelete}
                  style={{ padding: '6px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  🗑️ Удалить
                </button>
              </>
            )}
            <button onClick={() => setShowCreateTask(true)}
              style={{ padding: '6px 14px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              + Задача
            </button>
          </div>
        </div>
                {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, borderBottom: '1px solid #e0e0e0' }}>
          <button onClick={() => setActiveTab('board')} style={{
            padding: '8px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeTab === 'board' ? '#0056b3' : '#888',
            borderBottom: activeTab === 'board' ? '2px solid #0056b3' : '2px solid transparent',
            marginBottom: -1,
          }}>📋 Доска</button>
          <button onClick={() => setActiveTab('chat')} style={{
            padding: '8px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeTab === 'chat' ? '#0056b3' : '#888',
            borderBottom: activeTab === 'chat' ? '2px solid #0056b3' : '2px solid transparent',
            marginBottom: -1,
          }}>💬 Обсуждения</button>
          <button onClick={() => setActiveTab('files')} style={{
            padding: '8px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeTab === 'files' ? '#0056b3' : '#888',
            borderBottom: activeTab === 'files' ? '2px solid #0056b3' : '2px solid transparent',
            marginBottom: -1,
          }}>📁 Файлы</button>
        </div>
        {/* Company link */}

        {project?.company && (
          <div style={{ marginTop: 6, fontSize: 13, color: '#0d6efd' }}>
            🏢 Компания: <a href={`/admin/companies/${project.company.id}`} style={{ color: '#0d6efd', textDecoration: 'underline' }}
              onClick={e => { e.stopPropagation(); window.open(`/admin/companies/${project.company.id}`, '_blank'); }}>
              {project.company.name}
            </a>
          </div>
        )}
        {endDateDisplay && (
          <div style={{
            marginTop: 6, fontSize: 13,
            color: endDateDisplay.isOverdue ? '#dc3545' : '#888',
            fontWeight: endDateDisplay.isOverdue ? 600 : 400,
            padding: '4px 10px',
            background: endDateDisplay.isOverdue ? '#fff5f5' : 'transparent',
            borderRadius: 6,
            display: 'inline-block',
          }}>
            📅 Дедлайн: {endDateDisplay.endDateStr}
            {endDateDisplay.isOverdue
              ? ` — просрочено на ${endDateDisplay.diffDays} дн. ⚠️`
              : ` — осталось ${endDateDisplay.diffDays} дн.`
            }
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
          {membersInProject.slice(0, 8).map(m => (
            <div key={m.id} title={`${m.user?.firstName || ''} ${m.user?.lastName || ''}`}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: '#e9ecef', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                color: '#555', border: '1px solid #ddd',
              }}>
              {(m.user?.firstName?.[0] || '?')}{(m.user?.lastName?.[0] || '')}
            </div>
          ))}
          {membersInProject.length > 8 && (
            <div style={{ fontSize: 12, color: '#888' }}>+{membersInProject.length - 8}</div>
          )}
          {membersInProject.length === 0 && <span style={{ fontSize: 12, color: '#aaa' }}>Нет участников</span>}
        </div>
      </div>

      {/* Kanban Board */}
      {activeTab === 'board' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 20, minHeight: '50vh' }}>
          {BOARD_STATUSES.map(col => (
            <div key={col.value} style={{ minWidth: 260, maxWidth: 300, flex: 1 }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col.value)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{col.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{col.label}</span>
                <span style={{ background: '#f0f0f0', borderRadius: 12, padding: '2px 8px', fontSize: 12, color: '#666' }}>
                  {boardTasks[col.value]?.length || 0}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(boardTasks[col.value] || []).map(task => (
                  <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)}
                    onClick={() => openTaskDetail(task)}
                    style={{
                      background: '#fff', borderRadius: 10, padding: 12, cursor: 'pointer',
                      border: '1px solid #e9ecef', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      borderLeft: `3px solid ${col.color}`,
                      opacity: draggedTask === task.id ? 0.4 : 1,
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {task.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {task.priority && (
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                          background: (TASK_PRIORITIES.find(p => p.value === task.priority)?.color || '#6c757d') + '20',
                          color: TASK_PRIORITIES.find(p => p.value === task.priority)?.color || '#6c757d',
                        }}>
                          {TASK_PRIORITIES.find(p => p.value === task.priority)?.label || task.priority}
                        </span>
                      )}
                      {task.dueDate && (
                        <span style={{ fontSize: 10, color: new Date(task.dueDate) < new Date() ? '#dc3545' : '#888' }}>
                          📅 {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      {task.user && (
                        <span style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>
                          👤 {task.user.firstName}
                        </span>
                      )}
                    </div>
                    {parseLabels(task.labels).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {parseLabels(task.labels).map((l: any) => (
                          <span key={l.id} style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 4,
                            background: (l.color || '#6c757d') + '25', color: l.color || '#6c757d',
                          }}>{l.name}</span>
                        ))}
                      </div>
                    )}
                    {task._count && (task._count.comments || task._count.attachments || task._count.subtasks) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: '#aaa' }}>
                        {task._count.comments ? <span>💬 {task._count.comments}</span> : null}
                        {task._count.attachments ? <span>📎 {task._count.attachments}</span> : null}
                        {task._count.subtasks ? <span>📋 {task._count.subtasks}</span> : null}
                      </div>
                    )}
                  </div>
                ))}
                {(!boardTasks[col.value] || boardTasks[col.value].length === 0) && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#ccc', fontSize: 12, border: '1px dashed #e0e0e0', borderRadius: 10 }}>
                    Перетащите сюда
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'chat' ? (
        <CrmProjectChat token={token} projectId={projectId} />
      ) : (
        <CrmProjectFiles token={token} projectId={projectId} />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <CrmTaskCard
          token={token}
          task={selectedTask}
          projectId={projectId}
          allUsers={employees}
          employees={employees}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => loadProject()}
        />
      )}

      {/* Edit Project Modal */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowEdit(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 420, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>✏️ Редактировать проект</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Название</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputS} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Описание</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputS, minHeight: 60, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Дата завершения</label>
                <input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} style={inputS} />
                {editForm.endDate && (
                  <button onClick={() => setEditForm(f => ({ ...f, endDate: '' }))}
                    style={{ fontSize: 11, color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2, padding: 0 }}>
                    ✕ Очистить дату
                  </button>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Статус</label>
                <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={inputS}>
                  {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Цвет</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COLOR_PALETTE.map(c => (
                    <div key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: editForm.color === c ? '3px solid #333' : '3px solid transparent',
                      }} />
                  ))}
                </div>
              </div>
              <button onClick={handleEdit} style={{ padding: '10px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembers && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowMembers(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 400, maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>👥 Участники проекта</h3>
              <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                Текущие участники ({membersInProject.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {membersInProject.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#555' }}>
                        {(m.user?.firstName?.[0] || '?')}{(m.user?.lastName?.[0] || '')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.user?.firstName} {m.user?.lastName}</div>
                        {m.user?.email && <div style={{ fontSize: 11, color: '#888' }}>{m.user.email}</div>}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(m.id)}
                      style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#dc3545' }}>
                      Удалить
                    </button>
                  </div>
                ))}
                {membersInProject.length === 0 && <div style={{ fontSize: 13, color: '#aaa', padding: 12, textAlign: 'center' }}>Нет участников</div>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Добавить участника</div>
              <select value="" onChange={e => {
                if (e.target.value) { handleAddMember(e.target.value); e.target.value = ''; }
              }} style={inputS}>
                <option value="">Выберите сотрудника...</option>
                {availableEmployees.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                ))}
              </select>
              {availableEmployees.length === 0 && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Все сотрудники уже добавлены</div>}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreateTask(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, minWidth: 420, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>➕ Новая задача</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Название *</label>
                <input placeholder="Название задачи" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} style={inputS} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Описание</label>
                <textarea placeholder="Описание задачи" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputS, minHeight: 60, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Приоритет</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} style={inputS}>
                    {TASK_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Срок</label>
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} style={inputS} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Исполнитель</label>
                <select value={taskForm.userId} onChange={e => setTaskForm(f => ({ ...f, userId: e.target.value }))} style={inputS}>
                  <option value="">Не назначен</option>
                  {employees.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleCreateTask} style={{ padding: '10px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>
                Создать задачу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputS: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
