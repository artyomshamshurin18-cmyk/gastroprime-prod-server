import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from './api-config';

const AdminLogistics: React.FC<{ token: string }> = ({ token }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [routes, setRoutes] = useState<string[]>([]);
  const [routeDrivers, setRouteDrivers] = useState<Record<string, any[]>>({});
  const [routePoints, setRoutePoints] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const [newPoint, setNewPoint] = useState({
    routeName: '', date: '', type: 'delivery', address: '',
    contactPerson: '', contactPhone: '', timeWindowStart: '', timeWindowEnd: '',
    note: '', driverId: ''
  });

  useEffect(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    setWeekDates(dates);
  }, [selectedDate]);

  useEffect(() => { if (weekDates.length) loadData(); }, [weekDates]);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersRes = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const drivers = usersRes.data.filter((u: any) => u.role === 'DRIVER');
      const rDrivers: Record<string, any[]> = {};
      drivers.forEach((d: any) => {
        const rn = d.routeName || 'unknown';
        if (!rDrivers[rn]) rDrivers[rn] = [];
        rDrivers[rn].push(d);
      });
      setRouteDrivers(rDrivers);
      setRoutes(Object.keys(rDrivers).sort());

      const allPoints: Record<string, any[]> = {};
      for (const route of Object.keys(rDrivers)) {
        for (const date of weekDates) {
          const key = `${route}|${date}`;
          try {
            const res = await axios.get(`${API_URL}/logistics/route/${route}/${date}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            allPoints[key] = res.data.points || [];
          } catch { allPoints[key] = []; }
        }
      }

      // Загружаем сводку для каждой даты недели — компании с выборами
      for (const wDate of weekDates) {
        try {
          const summaryRes = await axios.get(`${API_URL}/admin/kitchen-summary?date=${wDate}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const summaryCompanies: any[] = summaryRes.data?.companies || [];
          if (Array.isArray(summaryCompanies)) {
            summaryCompanies.forEach((comp: any) => {
              const rn = comp.routeName || 'unknown';
              const companyName = comp.companyName || comp.name || '';
              if (companyName && rn) {
                const key = `${rn}|${wDate}`;
                if (!Array.isArray(allPoints[key])) allPoints[key] = [];
                const exists = allPoints[key].some((p: any) =>
                  (p.note && p.note.includes(companyName)) ||
                  (p.address && comp.address && p.address.includes(comp.address))
                );
                if (!exists) {
                  allPoints[key].push({
                    id: `summary-${comp.companyId || Math.random()}`,
                    type: 'delivery',
                    address: comp.address || companyName,
                    contactPerson: comp.contactPerson || '',
                    contactPhone: comp.contactPhone || '',
                    timeWindowStart: comp.deliveryTime?.split('-')[0]?.trim() || '',
                    timeWindowEnd: comp.deliveryTime?.split('-')[1]?.trim() || '',
                    note: `${companyName} — ${comp.totalPortions || 0} порций`,
                    driverId: null,
                    status: 'pending',
                    sortOrder: 0,
                    _fromSummary: true,
                  });
                }
              }
            });
          }
        } catch (e) {
          // Нет данных на эту дату — норм
        }
      }

      setRoutePoints(allPoints);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addPoint = async () => {
    await axios.post(`${API_URL}/logistics/points`, {
      ...newPoint, date: newPoint.date || selectedDate,
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    setShowModal(false);
    setNewPoint({ routeName: '', date: '', type: 'delivery', address: '', contactPerson: '', contactPhone: '', timeWindowStart: '', timeWindowEnd: '', note: '', driverId: '' });
    loadData();
  };

  const deletePoint = async (id: string) => {
    if (id.startsWith('summary-')) {
      // Точка из сводки — не удаляем из БД
      loadData();
      return;
    }
    await axios.delete(`${API_URL}/logistics/points/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    loadData();
  };

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>🚚 Логистика</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowModal(true)}
            style={{ background: '#b53b1f', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
            + Добавить точку
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>Загрузка...</div>}

      {!loading && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Маршрут</th>
                {weekDates.map((date, i) => (
                  <th key={date} style={{ ...thStyle, background: date === today ? '#fff3e0' : '#f5f5f5', minWidth: 140 }}>
                    {dayNames[i]}<br/><span style={{ fontSize: 11, color: '#666' }}>{date.slice(5)}</span>
                    {date === today && <span style={{ fontSize: 10, color: '#b53b1f', display: 'block' }}>сегодня</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.map(route => (
                <React.Fragment key={route}>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 600, background: '#fafafa' }}>
                      <div>🚚 Рейс {route}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        {routeDrivers[route]?.map(d => d.firstName || d.email).join(', ')}
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const key = `${route}|${date}`;
                      const pts = routePoints[key] || [];
                      const isExpanded = expandedCell === key;
                      return (
                        <td key={date} style={{ ...tdStyle, cursor: 'pointer', background: isExpanded ? '#fef3e2' : 'white' }}
                          onClick={() => setExpandedCell(isExpanded ? null : key)}>
                          {routeDrivers[route]?.map(d => (
                            <div key={d.id} style={{ fontSize: 11, marginBottom: 2 }}>
                              {d.firstName || d.email}
                              {d.phone && <span style={{ color: '#888' }}> {d.phone}</span>}
                            </div>
                          ))}
                          {pts.length > 0
                            ? <div style={{ fontSize: 11, color: '#b53b1f', fontWeight: 600, marginTop: 4 }}>
                                {pts.length} {pts.length === 1 ? 'точка' : 'точек'}
                              </div>
                            : <div style={{ fontSize: 10, color: '#ccc', marginTop: 4 }}>—</div>
                          }
                        </td>
                      );
                    })}
                  </tr>
                  {expandedCell && expandedCell.startsWith(route) && (
                    <tr>
                      <td colSpan={8} style={{ padding: 12, background: '#fef3e2', borderBottom: '1px solid #e0d5c8' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                          Детали: Рейс {route} — {expandedCell.split('|')[1]}
                        </div>
                        {(routePoints[expandedCell] || []).length === 0 && <div style={{ color: '#999' }}>Нет точек</div>}
                        {(routePoints[expandedCell] || []).map((point: any) => (
                          <div key={point.id} style={{
                            background: point._fromSummary ? '#f0f7ec' : 'white',
                            borderRadius: 8, padding: 10, marginBottom: 8,
                            border: point._fromSummary ? '1px solid #c8e6c9' : '1px solid #e0d5c8',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>
                                {point.type === 'pickup' ? '📦 Забор' : point.type === 'tasting' ? '🍽 Дегустация' : '📍 Доставка'}{' '}
                                {point.address}
                                {point._fromSummary && <span style={{ fontSize: 10, color: '#388e3c', marginLeft: 6 }}>(из сводки)</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                {point.contactPerson && <span>👤 {point.contactPerson}</span>}
                                {point.contactPhone && <span style={{ marginLeft: 8 }}>📞 {point.contactPhone}</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#666' }}>
                                {point.timeWindowStart && <span>🕐 {point.timeWindowStart}-{point.timeWindowEnd}</span>}
                              </div>
                              {point.note && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>📝 {point.note}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                              <span style={{
                                fontSize: 11, padding: '2px 6px', borderRadius: 4,
                                background: point.status === 'done' ? '#e8f5e9' : point.status === 'skipped' ? '#ffebee' : '#fff3e0',
                                color: point.status === 'done' ? '#2e7d32' : point.status === 'skipped' ? '#c62828' : '#e65100'
                              }}>
                                {point.status === 'done' ? '✅' : point.status === 'skipped' ? '❌' : '⏳'}
                              </span>
                              {!point._fromSummary && (
                                <button onClick={() => deletePoint(point.id)} style={{
                                  background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: 16
                                }} title="Удалить">🗑</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, width: 400, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>➕ Новая точка</h3>
            <label style={labelStyle}>Маршрут</label>
            <select value={newPoint.routeName} onChange={e => setNewPoint({...newPoint, routeName: e.target.value})} style={inputStyle}>
              <option value="">Выберите</option>
              {routes.map(r => <option key={r} value={r}>Рейс {r}</option>)}
            </select>
            <label style={labelStyle}>Водитель</label>
            <select value={newPoint.driverId} onChange={e => setNewPoint({...newPoint, driverId: e.target.value})} style={inputStyle}>
              <option value="">Не назначен</option>
              {(routeDrivers[newPoint.routeName] || []).map((d: any) => (
                <option key={d.id} value={d.id}>{d.firstName || d.email}</option>
              ))}
            </select>
            <label style={labelStyle}>Дата</label>
            <input type="date" value={newPoint.date || selectedDate} onChange={e => setNewPoint({...newPoint, date: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Тип</label>
            <select value={newPoint.type} onChange={e => setNewPoint({...newPoint, type: e.target.value})} style={inputStyle}>
              <option value="delivery">📍 Доставка</option>
              <option value="pickup">📦 Забор</option>
              <option value="tasting">🍽 Дегустация</option>
              <option value="custom">📍 Обычная</option>
            </select>
            <label style={labelStyle}>Адрес</label>
            <input type="text" value={newPoint.address} onChange={e => setNewPoint({...newPoint, address: e.target.value})} style={inputStyle} placeholder="ул. Примерная, 5" />
            <label style={labelStyle}>Контакт</label>
            <input type="text" value={newPoint.contactPerson} onChange={e => setNewPoint({...newPoint, contactPerson: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Телефон</label>
            <input type="text" value={newPoint.contactPhone} onChange={e => setNewPoint({...newPoint, contactPhone: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Время окно</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="time" value={newPoint.timeWindowStart} onChange={e => setNewPoint({...newPoint, timeWindowStart: e.target.value})} style={inputStyle} />
              <span>—</span>
              <input type="time" value={newPoint.timeWindowEnd} onChange={e => setNewPoint({...newPoint, timeWindowEnd: e.target.value})} style={inputStyle} />
            </div>
            <label style={labelStyle}>Заметка</label>
            <textarea value={newPoint.note} onChange={e => setNewPoint({...newPoint, note: e.target.value})} style={{...inputStyle, minHeight: 60}} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Отмена</button>
              <button onClick={addPoint} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#b53b1f', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: '8px 6px', border: '1px solid #e0e0e0', textAlign: 'center', fontSize: 12, position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 };
const tdStyle: React.CSSProperties = { padding: '8px 6px', border: '1px solid #e0e0e0', verticalAlign: 'top' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#666', marginBottom: 4, marginTop: 8 };
const inputStyle: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box', width: '100%' };

export default AdminLogistics;
