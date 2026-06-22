export { API_URL } from '../api-config';
export const CRM_STAGES = [
  { value: 'LEAD', label: '\u041b\u0438\u0434', color: '#6c757d', icon: '\ud83d\udccb' },
  { value: 'MODERATION', label: '\u0412 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0435', color: '#0d6efd', icon: '\ud83d\udd04' },
  { value: 'TASTING_SCHEDULED', label: '\u0414\u0435\u0433\u0443\u0441\u0442\u0430\u0446\u0438\u044f \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0430', color: '#ffc107', icon: '\ud83d\udcc5' },
  { value: 'TASTING_DONE', label: '\u0414\u0435\u0433\u0443\u0441\u0442\u0430\u0446\u0438\u044f \u043f\u0440\u043e\u0432\u0435\u0434\u0435\u043d\u0430', color: '#fd7e14', icon: '\u2705' },
  { value: 'NEGOTIATION', label: '\u0421\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u0435', color: '#0dcaf0', icon: '\ud83d\udcac' },
  { value: 'QUOTE_SENT', label: '\u041a\u041f \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e', color: '#8e44ad', icon: '\ud83d\udce9' },
  { value: 'CONTRACT', label: '\u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442', color: '#28a745', icon: '\ud83d\udcdd' },
  { value: 'DEFERRED', label: '\u041e\u0442\u043b\u043e\u0436\u0435\u043d\u044b\u0435', color: '#e67e22', icon: '\u23f3' },
  { value: 'LOST', label: '\u041f\u0440\u043e\u0438\u0433\u0440\u0430\u043d\u043d\u044b\u0435', color: '#dc3545', icon: '\ud83d\udc94' },
  { value: 'CONTRACT_SIGNED', label: '\u0414\u043e\u0433\u043e\u0432\u043e\u0440 \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043d', color: '#198754', icon: '\u270d\ufe0f' },
];

export const DEAL_SOURCES = [
  { value: 'COLD', label: '\u0425\u043e\u043b\u043e\u0434\u043d\u044b\u0439' },
  { value: 'SITE', label: '\u0421\u0430\u0439\u0442' },
  { value: 'REFERRAL', label: '\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u044f' },
  { value: 'CALL', label: '\u0417\u0432\u043e\u043d\u043e\u043a' },
  { value: 'OTHER', label: '\u0414\u0440\u0443\u0433\u043e\u0435' },
];

export const TASK_TYPES = [
  { value: 'FOLLOW_UP', label: '\u0421\u0432\u044f\u0437\u0430\u0442\u044c\u0441\u044f' },
  { value: 'CALL', label: '\u041f\u043e\u0437\u0432\u043e\u043d\u0438\u0442\u044c' },
  { value: 'MEETING', label: '\u0412\u0441\u0442\u0440\u0435\u0447\u0430' },
  { value: 'TASTING', label: '\u0414\u0435\u0433\u0443\u0441\u0442\u0430\u0446\u0438\u044f' },
  { value: 'OTHER', label: '\u0414\u0440\u0443\u0433\u043e\u0435' },
];

export const TASK_PRIORITIES = [
  { value: 'LOW', label: '\u041d\u0438\u0437\u043a\u0438\u0439', color: '#6c757d' },
  { value: 'NORMAL', label: '\u0421\u0440\u0435\u0434\u043d\u0438\u0439', color: '#0d6efd' },
  { value: 'HIGH', label: '\u0412\u044b\u0441\u043e\u043a\u0438\u0439', color: '#fd7e14' },
  { value: 'URGENT', label: '\u0421\u0440\u043e\u0447\u043d\u043e', color: '#dc3545' },
];

export const ROUTE_STATUSES = [
  { value: 'PLANNED', label: '\u041f\u043b\u0430\u043d', color: '#0d6efd' },
  { value: 'IN_PROGRESS', label: '\u0412 \u043f\u0443\u0442\u0438', color: '#ffc107' },
  { value: 'COMPLETED', label: '\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d', color: '#28a745' },
];

export const USER_ROLES = [
  { value: 'ADMIN', label: '\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440' },
  { value: 'MANAGER', label: '\u041c\u0435\u043d\u0435\u0434\u0436\u0435\u0440' },
  { value: 'OPERATOR', label: '\u041e\u043f\u0435\u0440\u0430\u0442\u043e\u0440' },
  { value: 'MASTER_CLIENT', label: '\u041a\u043b\u0438\u0435\u043d\u0442-\u043a\u043e\u043e\u0440\u0434\u0438\u043d\u0430\u0442\u043e\u0440' },
  { value: 'CLIENT', label: '\u041a\u043b\u0438\u0435\u043d\u0442' },
];


// ---- Project & Task Tracker Types ----

export interface CrmProject {
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

export interface CrmProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface CrmTaskComment {
  id: string;
  taskId: string;
  userId: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  text: string;
  mentions?: string[];
  createdAt: string;
  attachments?: CrmTaskAttachment[];
}

export interface CrmTaskAttachment {
  id: string;
  taskId?: string;
  commentId?: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CrmTaskChecklist {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  items: CrmTaskChecklistItem[];
}

export interface CrmTaskChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  completed: boolean;
  assignedTo?: string;
  sortOrder: number;
}

export const BOARD_STATUSES = [
  { value: 'TODO', label: 'К выполнению', color: '#6c757d', icon: '📋' },
  { value: 'IN_PROGRESS', label: 'В работе', color: '#0d6efd', icon: '🔧' },
  { value: 'IN_REVIEW', label: 'На проверке', color: '#fd7e14', icon: '👀' },
  { value: 'DONE', label: 'Готово', color: '#28a745', icon: '✅' },
];

export const PROJECT_STATUSES = [
  { value: 'ACTIVE', label: 'Активный', color: '#28a745', icon: '🟢' },
  { value: 'ON_HOLD', label: 'На паузе', color: '#ffc107', icon: '⏸️' },
  { value: 'COMPLETED', label: 'Завершён', color: '#6c757d', icon: '🏁' },
  { value: 'ARCHIVED', label: 'Архив', color: '#6c757d', icon: '📦' },
  { value: 'CANCELLED', label: 'Отменён', color: '#dc3545', icon: '❌' },
];

export interface CrmTask {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  deal?: { id: string; stage: string; company: { name: string } } | null;
  company?: { id: string; name: string } | null;
  type?: string;
  priority?: string;
  status?: string;
  boardStatus?: string;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  labels?: { id: string; name: string; color: string }[];
  _count?: { comments?: number; attachments?: number; subtasks?: number; tasks?: number; members?: number };
}

// Utility to parse label strings (stored as "name||color") to objects
export function parseLabels(labels: any): { id: string; name: string; color: string }[] {
  if (!labels) return [];
  if (Array.isArray(labels) && labels.length > 0 && typeof labels[0] === 'object' && labels[0].name) {
    return labels as any[];
  }
  if (Array.isArray(labels)) {
    return labels.map((l: string) => {
      const parts = l.split('||');
      return { id: l, name: parts[0] || l, color: parts[1] || '#6c757d' };
    });
  }
  return [];
}

// Reverse: convert objects to strings
export function serializeLabel(label: { id?: string; name: string; color: string }): string {
  return `${label.name}||${label.color}`;
}
