import React, { useState, useEffect } from 'react';
import waterLogo from '../assets/water.svg';
import './AdminDashboard.css';

export default function AdminDashboard({ token, onLogout }) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [viewMode, setViewMode] = useState('date');

  // Trạng thái ngày (dùng chung cho cả 2 tab)
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateData, setDateData] = useState(null);

  // Trạng thái cho tab User
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userList, setUserList] = useState([]); 
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userData, setUserData] = useState(null); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

  // 1. GỌI DỮ LIỆU TOÀN HỆ THỐNG THEO NGÀY CHỌN
  const fetchByDate = () => {
    setLoading(true); setError('');
    fetch(`${BACKEND_URL}/api/admin/checkins?date_str=${selectedDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { setDateData(data); setLoading(false); })
      .catch(err => { setError("Lỗi khi tải dữ liệu ngày!"); setLoading(false); });
  };

  // 2. LẤY DANH SÁCH USER
  const fetchAllUsers = () => {
    fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUserList(data))
      .catch(err => console.error("Lỗi tải danh sách User:", err));
  };

  // 3. LẤY HỒ SƠ TỔNG (STREAK) CỦA 1 USER
  const fetchUserRecord = (targetUsername) => {
    setLoading(true); setError(''); 
    fetch(`${BACKEND_URL}/api/admin/user-details?username=${targetUsername}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Không tìm thấy User này!');
        return res.json();
      })
      .then(data => { setUserData(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  // Auto-fetch khi đổi ngày
  useEffect(() => {
    fetchByDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Fetch danh sách User khi vào tab User
  useEffect(() => {
    if (viewMode === 'user' && userList.length === 0) fetchAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // 👇 ĐÃ SỬA: XÓA LỖI & RESET STATE KHI CHUYỂN TAB ĐỂ "CÁI GÌ RA CÁI NẤY"
  const handleTabChange = (mode) => {
    setViewMode(mode);
    setError(''); // Xóa ngay dòng báo lỗi (nếu có)
    
    if (mode === 'user') {
      setSelectedUser(null);
      setUserData(null);
      setSearchUserQuery('');
    }
  };

  // TÍNH TOÁN DỮ LIỆU
  const totalWaterInDay = dateData?.data?.reduce((sum, item) => sum + item.volume_ml, 0) || 0;
  
  // Lọc lấy danh sách ảnh của RIÊNG User đang chọn
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
          <button className={`admin-tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => handleTabChange('date')}>
            🗓️ Theo ngày
          </button>
          <button className={`admin-tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => handleTabChange('user')}>
            👤 User
          </button>
        </div>

        <main className="dashboard-main">
          
          {/* ========================================================= */}
          {/* TAB 1: HIỂN THỊ TẤT CẢ CHECK-IN CỦA TOÀN BỘ HỆ THỐNG        */}
          {/* ========================================================= */}
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

          {/* ========================================================= */}
          {/* TAB 2: QUẢN LÝ RIÊNG LẺ TỪNG USER                           */}
          {/* ========================================================= */}
          {viewMode === 'user' && (
            <div className="admin-section">
              
              {/* NẾU CHƯA CHỌN AI -> HIỆN DANH SÁCH LƯỚI ĐỂ CHỌN */}
              {!selectedUser && (
                <>
                  <div className="admin-filter-bar">
                    <span className="admin-filter-label">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm User..." 
                      value={searchUserQuery} 
                      onChange={(e) => setSearchUserQuery(e.target.value)}
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
                            key={u.username} 
                            className="admin-user-select-card"
                            onClick={() => {
                              setSelectedUser(u.username);
                              fetchUserRecord(u.username);
                            }}
                          >
                            <div className="user-icon">{u.role === 'admin' ? '👑' : '👤'}</div>
                            <div className="user-name">@{u.username}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {/* NẾU ĐÃ CHỌN 1 USER -> CHỈ HIỆN DỮ LIỆU CỦA USER ĐÓ */}
              {selectedUser && userData && (
                <>
                  <button className="admin-back-btn" onClick={() => {
                    setSelectedUser(null);
                    setUserData(null);
                    setError('');
                  }}>
                    ⬅ Quay lại danh sách User
                  </button>

                  {error && <div className="admin-status-text error">❌ {error}</div>}

                  <div className="admin-profile-card">
                    <h2 className="admin-profile-name">@{userData.username}</h2>
                    <div className="admin-profile-stats">
                      <div className="admin-p-stat"><span>🔥 Streak:</span> <strong>{userData.streak} ngày</strong></div>
                      <div className="admin-p-stat"><span>💧 Tổng nước (All):</span> <strong>{userData.total_volume} ml</strong></div>
                    </div>
                  </div>

                  <div className="admin-filter-bar" style={{ marginTop: '16px' }}>
                    <span className="admin-filter-label">Theo dõi ảnh ngày:</span>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)} 
                      className="admin-date-input"
                    />
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
}