// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from './types';

export default function CrmProjectChat({ token, projectId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  const loadMessages = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/crm/projects/${projectId}/messages`, { headers });
      const raw = data?.messages || (Array.isArray(data) ? data : []);
      setMessages(raw.map(m => ({
        ...m,
        attachments: m.attachments || [],
        user: m.user || null,
        text: m.text || ''
      })));
    } catch (e) {
      console.error('loadMessages error:', e);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    setUploadProgress('Отправка...');
    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      files.forEach(f => formData.append('files', f));
      await axios.post(`${API_URL}/crm/projects/${projectId}/messages`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      setFiles([]);
      setUploadProgress(null);
      await loadMessages();
    } catch (e) {
      console.error('send error:', e);
      setUploadProgress('Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  };

  const getUserName = (msg) => {
    if (!msg || !msg.user) return 'Пользователь';
    return msg.user.firstName || msg.user.lastName || msg.user.email || 'Пользователь';
  };

  const getFileIcon = (filename) => {
    const ext = (filename || '').split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext || '')) return '🖼️';
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc','docx'].includes(ext || '')) return '📝';
    if (['xls','xlsx','csv'].includes(ext || '')) return '📊';
    if (['zip','rar','7z','tar','gz'].includes(ext || '')) return '📦';
    return '📎';
  };

  return (
    <div style={{
      border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', height: 500, marginTop: 16,
    }}>
      <div style={{ padding: '10px 16px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0',
        fontWeight: 600, fontSize: 14, color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>💬 Обсуждение</span>
        <button onClick={loadMessages} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0056b3' }}>🔄 Обновить</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafbfc' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 40 }}>Нет сообщений. Напишите первое!</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #e8e8e8', maxWidth: '85%', alignSelf: 'flex-start' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0056b3', marginBottom: 4 }}>
              {getUserName(msg)}
              <span style={{ color: '#aaa', fontWeight: 400, marginLeft: 8 }}>{formatTime(msg.createdAt)}</span>
            </div>
            {msg.text ? <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div> : null}
            {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {msg.attachments.map(att => (
                  <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f0f4ff', borderRadius: 6,
                      fontSize: 12, color: '#0056b3', textDecoration: 'none', border: '1px solid #d0d8f0' }}>
                    {getFileIcon(att.fileName || att.filename)}
                    {att.fileName || att.filename || 'файл'}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {files.length > 0 ? (
        <div style={{ padding: '8px 16px', background: '#f8f9fa', borderTop: '1px solid #e0e0e0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{ background: '#e9ecef', borderRadius: 6, padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              📎 {f.name}
              <span onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: '#dc3545', fontWeight: 700, marginLeft: 2 }}>×</span>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #e0e0e0', background: '#fff', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <button onClick={() => fileInputRef.current?.click()} disabled={sending} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>📎</button>
        <input ref={fileInputRef} type="file" multiple onChange={(e) => {
          if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }} style={{ display: 'none' }} />
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Напишите сообщение..." disabled={sending} rows={1}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 36, maxHeight: 80 }}
        />
        <button onClick={handleSend} disabled={sending || (!text.trim() && files.length === 0)} style={{
          padding: '8px 18px', background: sending ? '#ccc' : '#0056b3', color: '#fff', border: 'none', borderRadius: 8,
          cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
        }}>{sending ? '...' : '→'}</button>
      </div>
      {uploadProgress ? <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: '2px 0' }}>{uploadProgress}</div> : null}
    </div>
  );
}
