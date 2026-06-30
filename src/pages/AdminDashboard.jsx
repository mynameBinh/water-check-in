import React, { useState, useEffect, useCallback } from 'react';
import waterLogo from '../assets/water.svg';
import './AdminDashboard.css';

const getLocalDateString = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

export default function AdminDashboard({ token, onLogout }) {
  const todayStr = getLocalDateString();
  const [viewMode, setViewMode] = useState('date');
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateData, setDateData] = useState([]); // Sửa thành mảng [] tránh lỗi .map hoặc .reduce

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userList, setUserList] = useState([]); 
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userData, setUserData] = useState(null); 

  const [editingGoal, setEditingGoal] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [editingTier, setEditingTier] = useState('');
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  // States Push Notification
  const [pushMessage, setPushMessage] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);

  const [gifts, setGifts] = useState([]);
  const [newGiftStreak, setNewGiftStreak] = useState('');
  const [newGiftText, setNewGiftText] = useState('');

  const [lastSyncedUser, setLastSyncedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

  const fetchByDate = useCallback((dateStr, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/checkins?date_str=${dateStr}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Không thể tải dữ liệu'); return res.json(); })
      .then(data => { 
        // Backend có thể trả về { data: [...] } hoặc trực tiếp array
        setDateData(data.data || data || []); 
        if (!isBackground) setLoading(false); 
      })
      .catch(err => { if (!isBackground) { setError(err.message); setLoading(false); } });
  }, [token]);

  const fetchUserList = useCallback(() => {
    fetch(`${BACKEND_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setUserList(data.filter(u => u.role !== 'admin')); })
      .catch(err => console.error(err));
  }, [token]);

  const fetchUserDetails = useCallback((username, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/user-details?username=${username}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Không thể tải dữ liệu user'); return res.json(); })
      .then(data => {
        setUserData(data); 
        setEditingGoal(data.daily_goal ? data.daily_goal.toString() : '2000'); 
        setEditingTier(data.tier || 'Thành viên');
        setLastSyncedUser(new Date().toLocaleTimeString('vi-VN'));
        if (!isBackground) setLoading(false);
      })
      .catch(err => { if (!isBackground) { setError(err.message); setLoading(false); } });
  }, [token]);

  const fetchGifts = useCallback(() => {
    fetch(`${BACKEND_URL}/api/gifts`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setGifts(data); })
      .catch(e => console.error(e));
  }, [token]);

  useEffect(() => {
    if (viewMode === 'date') fetchByDate(selectedDate);
    else if (viewMode === 'user') { fetchUserList(); if (selectedUser) fetchUserDetails(selectedUser); }
    else if (viewMode === 'gifts') fetchGifts();
  }, [viewMode, selectedDate, selectedUser, fetchByDate, fetchUserList, fetchUserDetails, fetchGifts]);

  const handleUpdateGoal = async () => {
    if (!selectedUser || !editingGoal) return;
    setIsUpdatingGoal(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser}/goal`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ daily_goal: parseInt(editingGoal) })
      });
      if (res.ok) { alert(`Đã cập nhật mục tiêu của ${selectedUser} thành ${editingGoal}ml`); fetchUserDetails(selectedUser, true); }
    } catch (err) { alert('Lỗi: ' + err.message); }
    setIsUpdatingGoal(false);
  };

  const handleUpdateTier = async () => {
    if (!selectedUser || !editingTier) return;
    setIsUpdatingTier(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser}/tier`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tier: editingTier })
      });
      if (res.ok) { alert(`Đã cập nhật danh hiệu của ${selectedUser} thành "${editingTier}"`); fetchUserDetails(selectedUser, true); }
    } catch (err) { alert('Lỗi: ' + err.message); }
    setIsUpdatingTier(false);
  };

  // Tính năng Push Notification mới
  const handleSendPushNotification = async () => {
    if (!selectedUser || !pushMessage.trim()) return alert("Sếp vui lòng nhập nội dung thông báo nhé!");
    setIsSendingPush(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/push-notification/${selectedUser}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: pushMessage.trim() })
      });
      if (res.ok) {
        alert(`🚀 Đã bắn thông báo thành công đến máy của ${selectedUser}!`);
        setPushMessage('');
      } else {
        alert("Lỗi! Không thể gửi thông báo.");
      }
    } catch (err) { alert('Lỗi: ' + err.message); }
    setIsSendingPush(false);
  };

  const handleAddGift = async () => {
    if (!newGiftStreak || !newGiftText) return alert("Vui lòng nhập đủ thông tin!");
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/gifts`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ streak_required: parseInt(newGiftStreak), gift_text: newGiftText })
      });
      if (res.ok) { setNewGiftStreak(''); setNewGiftText(''); fetchGifts(); }
    } catch(e) { alert("Lỗi khi thêm quà!"); }
  };

  const handleDeleteGift = async (id) => {
    if(window.confirm("Sếp chắc chắn muốn xóa mốc quà này?")) {
      await fetch(`${BACKEND_URL}/api/admin/gifts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchGifts();
    }
  };

  // An toàn khi truy cập mảng dữ liệu, tránh undefined gây crash màn hình trắng
  const safeDateData = Array.isArray(dateData) ? dateData : [];
  const totalVolumeOnDate = safeDateData.reduce((sum, item) => sum + (item.volume_ml || item.total_ml || 0), 0);
  const totalCheckinsOnDate = safeDateData.length;

  const filteredUsers = userList.filter(u => u.username && u.username.toLowerCase().includes(searchUserQuery.toLowerCase()));

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <header className="admin-header">
          <div className="admin-header-left">
            <img src={waterLogo} alt="Logo" className="admin-logo" />
            <div>
              <h1 className="admin-title">Admin Dashboard</h1>
              <p className="admin-subtitle">Hệ thống giám sát & Tương tác AI</p>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={onLogout}>Đăng xuất</button>
        </header>

        <main className="admin-inner">
          <div className="admin-tabs">
            <button className={`admin-tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => setViewMode('date')}>📅 Xem theo ngày</button>
            <button className={`admin-tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => setViewMode('user')}>👥 Thông tin cá nhân</button>
            <button className={`admin-tab-btn ${viewMode === 'gifts' ? 'active' : ''}`} onClick={() => setViewMode('gifts')}>🎁 Quản lý Quà</button>
          </div>

          {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
          {error && <div className="admin-error">{error}</div>}

          {!loading && !error && viewMode === 'date' && (
            <div className="admin-section fade-in">
              <div className="admin-control-bar">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-date-picker" />
              </div>
              
              <div className="admin-date-summary">
                <h3>Thống kê ngày {selectedDate}</h3>
                <div className="admin-stats-row">
                  <div className="admin-stat-box"><span className="stat-label">Tổng lượt Check-in</span><span className="stat-value">{totalCheckinsOnDate}</span></div>
                  <div className="admin-stat-box highlight"><span className="stat-label">Tổng lượng nước (ML)</span><span className="stat-value">{totalVolumeOnDate}</span></div>
                </div>
                <h4 style={{ color: 'var(--c-text-p)', marginBottom: '12px' }}>Chi tiết Check-in:</h4>
                
                {safeDateData.length === 0 ? <div className="admin-empty">Không có dữ liệu uống nước nào trong ngày này.</div> : (
                  <div className="admin-grid-cards">
                    {safeDateData.map((item, index) => (
                      <div key={item.checkin_id || index} className="admin-card">
                        <div className="admin-card-header"><span className="admin-card-user">👤 {item.username}</span><span className="admin-volume-tag">+{item.volume_ml || item.total_ml}ml</span></div>
                        <div className="admin-card-time">🕒 Lúc: {item.time || item.last_checkin_time}</div>
                        <div className="admin-image-box">
                          {item.image_link_click_here && item.image_link_click_here !== "Không có ảnh" ? <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer"><img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" /></a> : <div className="admin-no-img">🚫 Không ảnh</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && viewMode === 'gifts' && (
            <div className="admin-section fade-in">
              <h3 style={{color: '#f43f5e', marginBottom: 16}}>🎀 Quản lý mốc quà tặng</h3>
              <div className="gift-add-form" style={{display: 'flex', gap: 10, marginBottom: 20}}>
                <input type="number" placeholder="Mốc Streak..." value={newGiftStreak} onChange={e=>setNewGiftStreak(e.target.value)} className="admin-search-input" style={{flex: 1}} />
                <input type="text" placeholder="Lời nhắn phần quà..." value={newGiftText} onChange={e=>setNewGiftText(e.target.value)} className="admin-search-input" style={{flex: 2}} />
                <button onClick={handleAddGift} className="updateBtn">Thêm Quà</button>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                {gifts.map(g => (
                  <div key={g.id} className="admin-card" style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div><span style={{color: '#f472b6', fontWeight: 'bold', marginRight: 10, fontSize: 16}}>🔥 Streak {g.streak_required}:</span><span style={{color: 'var(--c-text-h)'}}>{g.gift_text}</span></div>
                    <button onClick={() => handleDeleteGift(g.id)} style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'}}>Xóa</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && viewMode === 'user' && (
            <div className="admin-section fade-in">
              {!selectedUser ? (
                <>
                  <input type="text" placeholder="🔍 Tìm kiếm user..." value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)} className="admin-search-input" />
                  <div className="admin-user-grid">
                    {filteredUsers.length === 0 ? <div className="admin-empty">Không tìm thấy user nào</div> : filteredUsers.map(u => (
                        <div key={u.username} className="admin-user-select-card" onClick={() => setSelectedUser(u.username)}><div className="user-icon">👤</div><div className="user-name">{u.username}</div></div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button className="admin-back-btn" onClick={() => { setSelectedUser(null); setUserData(null); }} style={{marginBottom: 20}}>⬅ Quay lại danh sách</button>
                  {userData && (
                    <>
                      <div className="admin-user-profile-card">
                        <div className="profile-header">
                          <div className="profile-avatar">👤</div>
                          <div><h2 className="profile-name">{userData.username}</h2><p className="profile-tier" style={{color: '#f472b6'}}>{userData.tier || 'Thành viên'}</p></div>
                        </div>
                        <div className="profile-stats">
                          <div className="p-stat"><span className="p-val">{userData.streak || 0}</span><span className="p-lbl">Streak 🔥</span></div>
                          <div className="p-stat"><span className="p-val">{userData.total_checkins || 0}</span><span className="p-lbl">Lần uống 💧</span></div>
                          <div className="p-stat"><span className="p-val">{userData.total_volume || 0}</span><span className="p-lbl">Tổng ml 🌊</span></div>
                        </div>

                        <div className="profile-update-section" style={{marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--c-border)'}}>
                          <div style={{display: 'flex', gap: 10, marginBottom: 12}}>
                            <div style={{flex: 1}}>
                              <label style={{fontSize: 12, color: 'var(--c-text-p)', marginBottom: 4, display: 'block'}}>🎯 Danh hiệu:</label>
                              <div style={{display: 'flex', gap: 6}}>
                                <input type="text" value={editingTier} onChange={(e) => setEditingTier(e.target.value)} className="admin-search-input" style={{margin: 0, padding: '8px 12px'}} />
                                <button className="updateBtn" onClick={handleUpdateTier} disabled={isUpdatingTier}>{isUpdatingTier ? '...' : 'Đổi'}</button>
                              </div>
                            </div>
                            <div style={{flex: 1}}>
                              <label style={{fontSize: 12, color: 'var(--c-text-p)', marginBottom: 4, display: 'block'}}>🎯 KPI Nước (ml):</label>
                              <div style={{display: 'flex', gap: 6}}>
                                <input type="number" value={editingGoal} onChange={(e) => setEditingGoal(e.target.value)} className="admin-search-input" style={{margin: 0, padding: '8px 12px'}} />
                                <button className="updateBtn" onClick={handleUpdateGoal} disabled={isUpdatingGoal}>{isUpdatingGoal ? '...' : 'Đổi'}</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* FORM ĐẨY THÔNG BÁO CHO USER */}
                        <div className="admin-push-panel" style={{marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--c-border)', textAlign: 'left'}}>
                          <label style={{fontSize: 13, fontWeight: '700', color: 'var(--c-text-h)', marginBottom: 6, display: 'block'}}>📣 Gửi thông báo nhắc nhở trực tiếp:</label>
                          <textarea 
                            rows="2"
                            placeholder="Nhập lời nhắc nhở khích lệ uống nước (VD: Bé ơi ngoan ngoãn uống nước nào!)..."
                            value={pushMessage}
                            onChange={(e) => setPushMessage(e.target.value)}
                            className="admin-push-textarea"
                          />
                          <button className="admin-push-btn-submit" onClick={handleSendPushNotification} disabled={isSendingPush}>
                            {isSendingPush ? 'Đang gửi...' : '🚀 Bắn thông báo ngay'}
                          </button>
                        </div>
                      </div>

                      <div className="admin-date-summary">
                        <h4 style={{ color: 'var(--c-text-p)', marginBottom: '12px' }}>Chi tiết Check-in (Hôm nay):</h4>
                        {(!userData.logs_today || userData.logs_today.length === 0) ? <div className="admin-empty">User này chưa uống nước hôm nay.</div> : (
                          <div className="admin-grid-cards">
                            {userData.logs_today.map((item, index) => (
                              <div key={item.checkin_id || index} className="admin-card">
                                <div className="admin-card-header"><span className="admin-card-time" style={{margin:0}}>🕒 {item.time}</span><span className="admin-volume-tag">+{item.volume_ml}ml</span></div>
                                <div className="admin-image-box" style={{ marginTop: '10px' }}>
                                  {item.image_link_click_here && item.image_link_click_here !== "Không có ảnh" ? <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer"><img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" /></a> : <div className="admin-no-img">🚫 Không ảnh</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}