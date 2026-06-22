// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from './types';

interface FileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  messageId: string | null;
  projectId: string;
  createdAt: string;
}

interface CrmProjectFilesProps {
  token: string;
  projectId: string;
}

export default function CrmProjectFiles({ token, projectId }: CrmProjectFilesProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headers = { Authorization: `Bearer ${token}` };

  const loadFiles = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/crm/projects/${projectId}/files`, { headers });
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadFiles error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFiles(); }, [projectId]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await axios.post(`${API_URL}/crm/projects/${projectId}/files`, form, { headers });
      await loadFiles();
    } catch (e) {
      console.error('upload error:', e);
      alert('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Удалить файл "${fileName}"?`)) return;
    setDeletingIds(prev => new Set(prev).add(fileId));
    try {
      await axios.delete(`${API_URL}/crm/projects/${projectId}/files/${fileId}`, { headers });
      await loadFiles();
    } catch (e) {
      console.error('delete error:', e);
      alert('Ошибка удаления файла');
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(fileId); return s; });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f);
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  };

  const handleDownload = (file: FileItem, e: React.MouseEvent) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = file.fileUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Загрузка файлов...</div>;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Зона загрузки */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#0056b3' : '#d0d0d0'}`,
          borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? '#f0f5ff' : '#f8f8f8',
          transition: 'all 0.2s', marginBottom: 16,
        }}>
        <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
        {uploading ? (
          <div style={{ color: '#666' }}>⏳ Загрузка...</div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 4 }}>📤</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#444' }}>Нажмите или перетащите файл сюда</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>PDF, DOC, XLS, JPG, PNG, ZIP — до 100 MB</div>
          </>
        )}
      </div>

      {/* Список файлов */}
      {files.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#aaa', border: '1px dashed #e0e0e0', borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 14 }}>В проекте пока нет файлов</div>
          <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>Загрузите первый файл</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(f => (
            <div key={f.id}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: '#fff', borderRadius: 10,
                border: '1px solid #e8e8e8',
              }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>
                {getFileIcon(f.fileName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.fileName}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {formatSize(f.fileSize)} · {new Date(f.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div onClick={e => handleDownload(f, e)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: '#0056b3', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                ⬇ Скачать
              </div>
              <div onClick={() => deleteFile(f.id, f.fileName)}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: deletingIds.has(f.id) ? '#ccc' : '#fee2e2',
                  color: deletingIds.has(f.id) ? '#999' : '#dc2626',
                  cursor: deletingIds.has(f.id) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {deletingIds.has(f.id) ? '⏳' : '🗑 Удалить'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
