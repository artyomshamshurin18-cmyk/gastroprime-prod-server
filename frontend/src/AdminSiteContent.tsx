import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://app.gastroprime.ru/api';

interface ContentBlock {
  id: number;
  type: string;
  pageSlug: string | null;
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  visible: boolean;
}

interface ContentPhoto {
  id: number;
  galleryKey: string;
  filename: string;
  title: string | null;
  visible: boolean;
}

const CONTENT_TYPES = ['PAGE_TEXT', 'GALLERY', 'REVIEW', 'CASE', 'FAQ', 'SOLUTION'];
const PAGE_SLUGS = ['home', 'production', 'office', 'construction', 'warehouses', 'events', 'quality', 'about', 'contacts', 'cases'];

export default function AdminSiteContent({ token }: { token: string }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [photos, setPhotos] = useState<ContentPhoto[]>([]);
  const [editing, setEditing] = useState<Partial<ContentBlock> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'blocks' | 'photos'>('blocks');
  const [message, setMessage] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoGalleryKey, setPhotoGalleryKey] = useState('events_gallery');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing] = useState(false);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchBlocks = async () => {
    const res = await fetch(`${API}/content/blocks`, { headers });
    if (res.ok) setBlocks(await res.json());
  };

  const fetchPhotos = async () => {
    const res = await fetch(`${API}/content/photos`, { headers });
    if (res.ok) setPhotos(await res.json());
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchBlocks(), fetchPhotos()]);
      setLoading(false);
    })();
  }, [token]);

  const handleSaveBlock = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage('');
    try {
      const body: Record<string, any> = { sortOrder: editing.sortOrder ?? 0, visible: editing.visible ?? true };
      for (const k of ['type', 'pageSlug', 'key', 'title', 'subtitle', 'body', 'imageUrl', 'imageAlt']) {
        if ((editing as any)[k] !== undefined) body[k] = (editing as any)[k];
      }
      const url = editing.id ? `${API}/content/blocks/${editing.id}` : `${API}/content/blocks`;
      const method = editing.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) { setMessage('Сохранено!'); setEditing(null); await fetchBlocks(); }
      else setMessage(`Ошибка: ${await res.text()}`);
    } catch (e: any) { setMessage(`Ошибка: ${e.message}`); }
    setSaving(false);
  };

  const handleDeleteBlock = async (id: number) => {
    if (!confirm('Удалить блок?')) return;
    const res = await fetch(`${API}/content/blocks/${id}`, { method: 'DELETE', headers });
    if (res.ok) { setMessage('Удалено'); await fetchBlocks(); }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) { setMessage('Выберите файл'); return; }
    setSaving(true); setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('galleryKey', photoGalleryKey);
      formData.append('visible', 'true');
      const res = await fetch(`${API}/content/photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) { setMessage('Фото загружено!'); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; await fetchPhotos(); }
      else setMessage(`Ошибка: ${await res.text()}`);
    } catch (e: any) { setMessage(`Ошибка: ${e.message}`); }
    setSaving(false);
  };

  const handleDeletePhoto = async (id: number) => {
    if (!confirm('Удалить фото?')) return;
    const res = await fetch(`${API}/content/photos/${id}`, { method: 'DELETE', headers });
    if (res.ok) { setMessage('Фото удалено'); await fetchPhotos(); }
  };

  const handleSyncSite = async () => {
    setSyncing(true); setMessage('Запрос пересборки...');
    const res = await fetch(`${API}/admin/sync-site`, { method: 'POST', headers });
    setMessage(res.ok ? 'Сайт пересобран!' : 'Ошибка');
    setSyncing(false);
  };

  if (loading) return <div className="p-6">Загрузка...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Контент сайта</h1>
      {message && <div className="mb-4 p-2 bg-gray-100 rounded dark:bg-gray-700">{message}</div>}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('blocks')} className={`px-4 py-2 rounded ${tab === 'blocks' ? 'bg-amber-500 text-black' : 'bg-gray-200 dark:bg-gray-700'}`}>Блоки</button>
        <button onClick={() => setTab('photos')} className={`px-4 py-2 rounded ${tab === 'photos' ? 'bg-amber-500 text-black' : 'bg-gray-200 dark:bg-gray-700'}`}>Фото</button>
        <button onClick={handleSyncSite} disabled={syncing} className="px-4 py-2 rounded bg-blue-500 text-white ml-auto">{syncing ? '...' : '⟳ Синхронизировать'}</button>
      </div>

      {tab === 'blocks' && (
        <>
          <button onClick={() => setEditing({ type: 'PAGE_TEXT', key: '', sortOrder: 0, visible: true })} className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">+ Новый блок</button>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Тип</th>
                  <th className="p-2 text-left">Страница</th>
                  <th className="p-2 text-left">Ключ</th>
                  <th className="p-2 text-left">Заголовок</th>
                  <th className="p-2 text-left">Видимость</th>
                  <th className="p-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {blocks.map(b => (
                  <tr key={b.id} className="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">{b.id}</td>
                    <td className="p-2">{b.type}</td>
                    <td className="p-2">{b.pageSlug || '-'}</td>
                    <td className="p-2 font-mono text-xs">{b.key}</td>
                    <td className="p-2">{b.title || '-'}</td>
                    <td className="p-2">{b.visible ? '✅' : '❌'}</td>
                    <td className="p-2 flex gap-1">
                      <button onClick={() => setEditing(b)} className="px-2 py-1 bg-amber-400 text-black rounded text-xs">✏️</button>
                      <button onClick={() => handleDeleteBlock(b.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">🗑️</button>
                    </td>
                  </tr>
                ))}
                {blocks.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Нет блоков</td></tr>}
              </tbody>
            </table>
          </div>
          {editing && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">{editing.id ? 'Редактировать' : 'Новый блок'}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Тип</label>
                    <select value={editing.type} onChange={e => setEditing({...editing, type: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700">
                      {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Страница</label>
                    <input value={editing.pageSlug || ''} onChange={e => setEditing({...editing, pageSlug: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" list="slugs" />
                    <datalist id="slugs">{PAGE_SLUGS.map(s => <option key={s} value={s} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ключ</label>
                    <input value={editing.key || ''} onChange={e => setEditing({...editing, key: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Сортировка</label>
                    <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing({...editing, sortOrder: +e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Заголовок</label>
                    <input value={editing.title || ''} onChange={e => setEditing({...editing, title: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Подзаголовок</label>
                    <input value={editing.subtitle || ''} onChange={e => setEditing({...editing, subtitle: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Контент (HTML)</label>
                    <textarea value={editing.body || ''} onChange={e => setEditing({...editing, body: e.target.value})} rows={5} className="w-full p-2 border rounded font-mono text-xs dark:bg-gray-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL картинки</label>
                    <input value={editing.imageUrl || ''} onChange={e => setEditing({...editing, imageUrl: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alt</label>
                    <input value={editing.imageAlt || ''} onChange={e => setEditing({...editing, imageAlt: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={editing.visible ?? true} onChange={e => setEditing({...editing, visible: e.target.checked})} /> Видимый</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={handleSaveBlock} disabled={saving} className="px-4 py-2 bg-amber-500 text-black rounded">{saving ? '...' : 'Сохранить'}</button>
                  <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">Отмена</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'photos' && (
        <>
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <h3 className="font-bold mb-2">Загрузить фото</h3>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium mb-1">Галерея</label>
                <select value={photoGalleryKey} onChange={e => setPhotoGalleryKey(e.target.value)} className="p-2 border rounded dark:bg-gray-600">
                  <option value="events_gallery">Мероприятия</option>
                  <option value="cases_gallery">Кейсы</option>
                  <option value="production_gallery">Производство</option>
                  <option value="main_gallery">Главная</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Файл</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
              <button onClick={handleUploadPhoto} disabled={saving || !photoFile} className="px-4 py-2 bg-amber-500 text-black rounded">{saving ? '...' : 'Загрузить'}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map(p => (
              <div key={p.id} className="border rounded-lg overflow-hidden dark:border-gray-600 relative group">
                <img src={`${API.replace('/api', '')}/uploads/content/${p.filename}`} alt={p.title || p.filename} className="w-full h-32 object-cover" />
                <div className="p-2 text-xs truncate">{p.title || p.filename}</div>
                <button onClick={() => handleDeletePhoto(p.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">✕</button>
              </div>
            ))}
            {photos.length === 0 && <div className="col-span-full text-center py-8 text-gray-500">Нет фото</div>}
          </div>
        </>
      )}
    </div>
  );
}
