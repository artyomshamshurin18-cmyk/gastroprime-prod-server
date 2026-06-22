'use client';

import { useState, useEffect } from 'react';

// Fallback API URL — используем относительный путь
const API_BASE = '/api';

// Login form
function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@catering.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('Login attemp:', API_BASE + '/auth/login');
      const res = await fetch(API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.access_token || data.token || data.accessToken;
        if (token) {
          onLogin(token);
        } else {
          setError('Токен не получен');
          console.log('Response:', data);
        }
      } else {
        const txt = await res.text();
        setError('Ошибка: ' + res.status + ' - ' + txt.slice(0, 100));
      }
    } catch (err) {
      setError('Ошибка соединения: ' + String(err));
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-white text-center">Админ-панель</h1>
        <p className="mb-6 text-center text-sm text-slate-400">Gastroprime — управление контентом</p>
        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Пароль</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Admin dashboard
function AdminDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState<'blocks' | 'photos'>('blocks');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoGalleryKey, setPhotoGalleryKey] = useState('events_gallery');
  const [activePageFilter, setActivePageFilter] = useState('');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        fetch(API_BASE + '/content/blocks', { headers }).then(r => r.ok ? r.json() : []),
        fetch(API_BASE + '/content/photos', { headers }).then(r => r.ok ? r.json() : []),
      ]);
      setBlocks(b);
      setPhotos(p);
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  const saveBlock = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage('');
    const body: Record<string, any> = { sortOrder: editing.sortOrder ?? 0, visible: editing.visible ?? true };
    for (const k of ['type', 'pageSlug', 'key', 'title', 'subtitle', 'body', 'imageUrl', 'imageAlt']) {
      if ((editing as any)[k] !== undefined) body[k] = (editing as any)[k];
    }
    const method = editing.id ? 'PUT' : 'POST';
    const url = editing.id ? `${API_BASE}/content/blocks/${editing.id}` : `${API_BASE}/content/blocks`;
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      setMessage(res.ok ? '✅ Сохранено!' : `❌ ${res.status}: ${await res.text()}`);
      if (res.ok) { setEditing(null); fetchData(); }
    } catch (e) {
      setMessage('❌ ' + String(e));
    }
    setSaving(false);
  };

  const deleteBlock = async (id: number) => {
    if (!confirm('Удалить?')) return;
    const res = await fetch(`${API_BASE}/content/blocks/${id}`, { method: 'DELETE', headers });
    if (res.ok) { setMessage('✅ Удалено'); fetchData(); }
  };

  const deletePhoto = async (id: number) => {
    if (!confirm('Удалить фото?')) return;
    try {
      const res = await fetch(`${API_BASE}/content/photos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage('✅ Удалено');
        fetchData();
      } else {
        setMessage('❌ ' + res.status + ': ' + (await res.text()).slice(0,100));
      }
    } catch(e) {
      setMessage('❌ ' + String(e));
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    setSaving(true);
    setMessage('');
    const fd = new FormData();
    fd.append('file', photoFile);
    fd.append('galleryKey', photoGalleryKey);
    fd.append('visible', 'true');
    try {
      const res = await fetch(API_BASE + '/content/photos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      setMessage(res.ok ? '✅ Загружено!' : `❌ ${res.status}: ${await res.text()}`);
      if (res.ok) { setPhotoFile(null); fetchData(); }
    } catch (e) {
      setMessage('❌ ' + String(e));
    }
    setSaving(false);
  };

  const CONTENT_TYPES = ['PAGE_TEXT', 'GALLERY', 'REVIEW', 'CASE', 'FAQ', 'SOLUTION'];
  const PAGE_SLUGS = ['home', 'production', 'office', 'construction', 'warehouses', 'events', 'quality', 'about', 'contacts', 'cases'];
  const GALLERY_KEYS = ['events_gallery', 'cases_gallery', 'production_gallery', 'main_gallery'];

  const filteredBlocks = activePageFilter
    ? blocks.filter(b => b.pageSlug === activePageFilter)
    : blocks;
  const pageSlugs = [...new Set(blocks.map(b => b.pageSlug).filter(Boolean))];

  if (loading) return <div className="p-8 text-center text-slate-400">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-bold text-white">📝 Управление контентом сайта</h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-slate-400 hover:text-amber-400">← На сайт</a>
            <button onClick={() => {
              localStorage.removeItem('admin_token');
              window.location.reload();
            }} className="text-sm text-slate-500 hover:text-red-400">Выйти</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {message && (
          <div className="mb-4 rounded-lg bg-slate-800 p-3 text-sm text-slate-300">{message}</div>
        )}

        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab('blocks')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'blocks' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            📄 Блоки ({blocks.length})
          </button>
          <button onClick={() => setTab('photos')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'photos' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            🖼️ Фото ({photos.length})
          </button>
        </div>

        {tab === 'blocks' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button onClick={() => setEditing({ type: 'PAGE_TEXT', key: '', sortOrder: 0, visible: true })}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">
                + Новый блок
              </button>
              <div className="ml-auto flex gap-2">
                <span className="text-xs text-slate-500 self-center">Фильтр:</span>
                <button onClick={() => setActivePageFilter('')} className={`rounded px-3 py-1 text-xs ${!activePageFilter ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>Все</button>
                {pageSlugs.map(s => (
                  <button key={s} onClick={() => setActivePageFilter(s)} className={`rounded px-3 py-1 text-xs ${activePageFilter === s ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-left text-slate-400">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Тип</th>
                    <th className="px-4 py-3">Страница</th>
                    <th className="px-4 py-3">Ключ</th>
                    <th className="px-4 py-3">Заголовок</th>
                    <th className="px-4 py-3 text-center">V</th>
                    <th className="px-4 py-3 text-center">Sort</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlocks.map((b: any) => (
                    <tr key={b.id} className="border-t border-slate-800 text-slate-300 hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-xs text-slate-500">{b.id}</td>
                      <td className="px-4 py-3"><span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{b.type}</span></td>
                      <td className="px-4 py-3 text-xs">{b.pageSlug || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.key}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">{b.title || '-'}</td>
                      <td className="px-4 py-3 text-center">{b.visible ? '✅' : '❌'}</td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">{b.sortOrder ?? 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => setEditing(b)} className="mr-2 text-amber-400 hover:text-amber-300">✏️</button>
                        <button onClick={() => deleteBlock(b.id)} className="text-red-400 hover:text-red-300">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edit Modal */}
            {editing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditing(null)}>
                <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-900 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                  <h2 className="mb-4 text-lg font-bold text-white">{editing.id ? `✏️ Редактировать #${editing.id}` : '➕ Новый блок'}</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Тип</label>
                        <select value={editing.type} onChange={e => setEditing({...editing, type: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm">
                          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Страница</label>
                        <input value={editing.pageSlug || ''} onChange={e => setEditing({...editing, pageSlug: e.target.value})} list="slugs" className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" placeholder="home, about..." />
                        <datalist id="slugs">{PAGE_SLUGS.map(s => <option key={s} value={s} />)}</datalist>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Ключ</label>
                        <input value={editing.key || ''} onChange={e => setEditing({...editing, key: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" placeholder="hero_title, about_text..." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Сортировка</label>
                        <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing({...editing, sortOrder: +e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Заголовок</label>
                      <input value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Подзаголовок</label>
                      <input value={editing.subtitle || ''} onChange={e => setEditing({...editing, subtitle: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Контент (HTML)</label>
                      <textarea value={editing.body || ''} onChange={e => setEditing({...editing, body: e.target.value})} rows={5} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-xs font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">URL картинки</label>
                        <input value={editing.imageUrl || ''} onChange={e => setEditing({...editing, imageUrl: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Alt текст</label>
                        <input value={editing.imageAlt || ''} onChange={e => setEditing({...editing, imageAlt: e.target.value})} className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={editing.visible ?? true} onChange={e => setEditing({...editing, visible: e.target.checked})} /> Видимый
                    </label>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={saveBlock} disabled={saving} className="rounded-lg bg-amber-500 px-6 py-2 font-bold text-black hover:bg-amber-400 disabled:opacity-50">{saving ? '⏳' : '💾 Сохранить'}</button>
                    <button onClick={() => setEditing(null)} className="rounded-lg bg-slate-700 px-6 py-2 text-white hover:bg-slate-600">Отмена</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'photos' && (
          <>
            <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 font-medium text-white">📤 Загрузить новое фото</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Галерея</label>
                  <select value={photoGalleryKey} onChange={e => setPhotoGalleryKey(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white text-sm">
                    {GALLERY_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Файл</label>
                  <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-amber-500 file:px-3 file:py-1 file:text-sm file:font-medium file:text-black" />
                </div>
                <button onClick={uploadPhoto} disabled={saving || !photoFile}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50">
                  {saving ? '⏳' : '📤 Загрузить'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map((p: any) => (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50">
                  <img src={'/uploads/content/' + p.filename} alt={p.title || ''}
                    className="h-28 w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" fill="%23333"><rect width="200" height="100"/><text x="10" y="55" fill="%23666" font-size="12">no img</text></svg>'; }}
                  />
                  <div className="p-2 text-xs text-slate-400 truncate">{p.title || p.filename}</div>
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-400">{p.galleryKey || '-'}</span>
                  <button onClick={() => deletePhoto(p.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">✕</button>
                </div>
              ))}
              {photos.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500">Нет загруженных фото</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Main page component
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = window.localStorage.getItem('admin_token');
    if (t) setToken(t);
  }, []);

  const handleLogin = (t: string) => {
    window.localStorage.setItem('admin_token', t);
    setToken(t);
  };

  if (!token) return <LoginForm onLogin={handleLogin} />;
  return <AdminDashboard token={token} />;
}
