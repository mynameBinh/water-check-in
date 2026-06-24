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
  const [dateData, setDateData] = useState(null);

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userList, setUserList] = useState([]); 
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userData, setUserData] = useState(null); 

  const [editingGoal, setEditingGoal] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  const [editingTier, setEditingTier] = useState('');
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);

  const [lastSyncedUser, setLastSyncedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

  const fetchByDate = useCallback((dateStr, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/checkins?date_str=${dateStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { setDateData(data); if (!isBackground) setLoading(false); })
      .catch(err => { 
        if (!isBackground) setError("Lỗi khi tải dữ liệu ngày!"); 
        if (!isBackground) setLoading(false); 
      });
  }, [token]);

  const fetchAllUsers = useCallback(() => {
    fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUserList(data))
      .catch(err => console.error("Lỗi tải danh sách User:", err));
  }, [token]);

  const fetchUserRecord = useCallback((targetUsername, isBackground = false) => {
    if (!isBackground) { setLoading(true); setError(''); }
    fetch(`${BACKEND_URL}/api/admin/user-details?username=${targetUsername}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Không tìm thấy User này!');
        return res.json();
      })
      .then(data => { setUserData(data); if (!isBackground) setLoading(false); })
      .catch(err => { 
        if (!isBackground) setError(err.message); 
        if (!isBackground) setLoading(false); 
      });
  }, [token]);

  useEffect(() => {
    if (userData && userData.username !== lastSyncedUser) {
      const currentGoal = userData.daily_goal !== undefined ? userData.daily_goal : 1000;
      setEditingGoal(currentGoal);
      setEditingTier(userData.tier || 'Thành viên'); 
      setLastSyncedUser(userData.username);
    }
  }, [userData, lastSyncedUser]);

  const handleUpdateGoal = () => {
    if (!userData) return;
    setIsUpdatingGoal(true);
    fetch(`${BACKEND_URL}/api/admin/users/${userData.username}/goal`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ daily_goal: parseInt(editingGoal, 10) || 1000 })
    })
      .then(res => {
        if (!res.ok) throw new Error('Không thể cập nhật mục tiêu uống nước!');
        return res.json();
      })
      .then(() => {
        setUserData(prev => ({ ...prev, daily_goal: parseInt(editingGoal, 10) }));
        setIsUpdatingGoal(false);
        alert(`✅ Đã đổi mục tiêu của @${userData.username} thành ${editingGoal}ml thành công!`);
      })
      .catch(err => {
        alert(`❌ Thất bại: ${err.message}`);
        setIsUpdatingGoal(false);
      });
  };

  const handleUpdateTier = () => {
    if (!userData) return;
    setIsUpdatingTier(true);
    fetch(`${BACKEND_URL}/api/admin/users/${userData.username}/tier`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tier: editingTier })
    })
      .then(res => {
        if (!res.ok) throw new Error('Không thể cập nhật danh hiệu!');
        return res.json();
      })
      .then(() => {
        setUserData(prev => ({ ...prev, tier: editingTier }));
        setIsUpdatingTier(false);
        alert(`✅ Đã phong tước hiệu "${editingTier}" cho @${userData.username} thành công!`);
      })
      .catch(err => {
        alert(`❌ Thất bại: ${err.message}`);
        setIsUpdatingTier(false);
      });
  };

  useEffect(() => {
    fetchByDate(selectedDate, false); 
    const intervalDate = setInterval(() => { fetchByDate(selectedDate, true); }, 10000);
    return () => clearInterval(intervalDate);
  }, [selectedDate, fetchByDate]);

  useEffect(() => {
    if (!selectedUser) return;
    const intervalUser = setInterval(() => { fetchUserRecord(selectedUser, true); }, 10000);
    return () => clearInterval(intervalUser);
  }, [selectedUser, fetchUserRecord]);

  useEffect(() => {
    if (viewMode === 'user' && userList.length === 0) fetchAllUsers();
  }, [viewMode, userList.length, fetchAllUsers]);

  const handleTabChange = (mode) => {
    setViewMode(mode);
    setError(''); 
    if (mode === 'user') {
      setSelectedUser(null);
      setUserData(null);
      setSearchUserQuery('');
      setLastSyncedUser('');
    }
  };

  const totalWaterInDay = dateData?.data?.reduce((sum, item) => sum + item.volume_ml, 0) || 0;
  const userLogsOnDate = dateData?.data?.filter(item => item.username === selectedUser) || [];
  const userWaterOnDate = userLogsOnDate.reduce((sum, item) => sum + item.volume_ml, 0);

  return (
    <div className="dashboard">
      <header className="top-bar">
        <img src={waterLogo} alt="Water logo" className="top-bar-logo" />
        <span className="top-bar-title">Quản trị Hệ thống</span>
        <button onClick={onLogout} className="logout-button">Đăng xuất</button>
      </header>

      <div className="dashboard-inner admin-inner">
        <div className="admin-tabs">
          <button className={`admin-tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => handleTabChange('date')}>🗓️ Theo ngày</button>
          <button className={`admin-tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => handleTabChange('user')}>👤 User</button>
        </div>

        <main className="dashboard-main">
          {viewMode === 'date' && (
            <div className="admin-section">
              <div className="admin-filter-bar">
                <span className="admin-filter-label">Chọn ngày:</span>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-date-input"/>
              </div>

              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <p className="admin-stat-label">LƯỢT CHECK-IN</p>
                  <p className="admin-stat-value text-blue">{dateData?.total_checkins || 0}</p>
                </div>
                <div className="admin-stat-card">
                  <p className="admin-stat-label">TỔNG NƯỚC UỐNG</p>
                  <p className="admin-stat-value text-green">{totalWaterInDay} ml</p>
                </div>
              </div>

              {loading && <div className="admin-status-text">🔄 Đang tải dữ liệu...</div>}
              {error && <div className="admin-status-text error">❌ {error}</div>}

              {!loading && !error && dateData && (
                <div className="admin-log-container">
                  <h2 className="admin-section-title">Nhật ký hệ thống ngày {selectedDate}</h2>
                  {dateData.data.length === 0 ? (
                    <div className="admin-empty-state">Không có ai check-in vào ngày này.</div>
                  ) : (
                    <div className="admin-grid-cards">
                      {dateData.data.map((item) => (
                        <div key={item.checkin_id} className="admin-card">
                          <div className="admin-card-header">
                            <span className="admin-user-name">@{item.username}</span>
                            <span className="admin-volume-tag">+{item.volume_ml}ml</span>
                          </div>
                          <div className="admin-card-time">🕒 {item.time}</div>
                          <div className="admin-image-box">
                            {item.image_link_click_here !== "Không có ảnh" ? (
                              <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer">
                                <img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" />
                              </a>
                            ) : (<div className="admin-no-img">🚫 Không có ảnh</div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'user' && (
            <div className="admin-section">
              {!selectedUser && (
                <>
                  <div className="admin-filter-bar">
                    <span className="admin-filter-label">🔍</span>
                    <input 
                      type="text" placeholder="Tìm kiếm User..." 
                      value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>

                  {userList.length === 0 ? (
                    <div className="admin-status-text">🔄 Đang tải danh sách...</div>
                  ) : (
                    <div className="admin-user-list-grid">
                      {userList
                        .filter(u => u.username.toLowerCase().includes(searchUserQuery.toLowerCase()))
                        .map(u => (
                          <div 
                            key={u.username} className="admin-user-select-card"
                            onClick={() => { setSelectedUser(u.username); fetchUserRecord(u.username); }}
                          >
                            <div className="user-icon">{u.role === 'admin' ? '👑' : '👤'}</div>
                            <div className="user-name">@{u.username}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {selectedUser && (
                <>
                  <button className="admin-back-btn" onClick={() => {
                    setSelectedUser(null); setUserData(null); setError(''); setLastSyncedUser('');
                  }}>
                    ⬅ Quay lại danh sách User
                  </button>

                  {error && <div className="admin-status-text error">❌ {error}</div>}
                  {!userData && !error && <div className="admin-status-text">🔄 Đang tải dữ liệu của @{selectedUser}...</div>}

                  {userData && (
                    <>
                      <div className="admin-profile-card">
                        <h2 className="admin-profile-name">@{userData.username}</h2>
                        <div className="admin-profile-stats">
                          <div className="admin-p-stat"><span>🔥 Streak:</span> <strong>{userData.streak} ngày</strong></div>
                          <div className="admin-p-stat"><span>💧 Tổng nước (All):</span> <strong>{userData.total_volume} ml</strong></div>
                        </div>

                        {/* Tùy chỉnh KPI */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>🎯 KPI Nước:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="number" value={editingGoal} onChange={(e) => setEditingGoal(e.target.value)} className='updateInput' />
                            <span style={{ fontSize: '14px', color: '#fff' }}>ml</span>
                          </div>
                          <button type="button" onClick={handleUpdateGoal} disabled={isUpdatingGoal} className='updateBtn'>
                            {isUpdatingGoal ? 'Đang lưu...' : 'Cập nhật'}
                          </button>
                        </div>

                        {/* Tùy chỉnh Tier */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>👑 Danh hiệu:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <input 
                              type="text" value={editingTier} onChange={(e) => setEditingTier(e.target.value)}
                              className='updateInput' style={{ width: '100%', minWidth: '150px' }} placeholder="Vd: Thành viên VIP..."
                            />
                          </div>
                          <button type="button" onClick={handleUpdateTier} disabled={isUpdatingTier} className='updateBtn'>
                            {isUpdatingTier ? 'Đang lưu...' : 'Cập nhật'}
                          </button>
                        </div>
                      </div>

                      <div className="admin-filter-bar" style={{ marginTop: '16px' }}>
                        <span className="admin-filter-label">Theo dõi ảnh ngày:</span>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="admin-date-input" />
                      </div>

                      <div className="admin-log-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h2 className="admin-section-title" style={{ margin: 0 }}>Nhật ký ngày {selectedDate}</h2>
                          <span className="text-green" style={{ fontWeight: 'bold' }}>Đã uống: {userWaterOnDate}ml</span>
                        </div>

                        {userLogsOnDate.length === 0 ? (
                          <div className="admin-empty-state">User này chưa uống nước hôm nay.</div>
                        ) : (
                          <div className="admin-grid-cards">
                            {userLogsOnDate.map((item) => (
                              <div key={item.checkin_id} className="admin-card">
                                <div className="admin-card-header">
                                  <span className="admin-card-time" style={{margin:0}}>🕒 {item.time}</span>
                                  <span className="admin-volume-tag">+{item.volume_ml}ml</span>
                                </div>
                                <div className="admin-image-box" style={{ marginTop: '10px' }}>
                                  {item.image_link_click_here !== "Không có ảnh" ? (
                                    <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer">
                                      <img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" loading="lazy" />
                                    </a>
                                  ) : (<div className="admin-no-img">🚫 Không ảnh</div>)}
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