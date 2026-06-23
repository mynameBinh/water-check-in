import React, { useState, useEffect } from 'react';
import waterLogo from './public/favicon.svg'; // Đường dẫn logo đồng bộ với app
import './AdminDashboard.css';

export default function AdminDashboard({ token, onLogout }) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Trạng thái quản lý Tab (viewMode: 'date' hoặc 'user')
  const [viewMode, setViewMode] = useState('date');

  // Trạng thái cho tab Theo Ngày
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dateData, setDateData] = useState(null);

  // Trạng thái cho tab Theo Nhân Viên
  const [searchUsername, setSearchUsername] = useState('');
  const [userData, setUserData] = useState(null);

  // Trạng thái chung
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

  // 1. API GỌI DỮ LIỆU THEO NGÀY
  const fetchByDate = () => {
    setLoading(true); setError(''); setUserData(null);
    fetch(`${BACKEND_URL}/api/admin/checkins?date_str=${selectedDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { setDateData(data); setLoading(false); })
      .catch(err => { setError("Lỗi khi tải dữ liệu ngày!"); setLoading(false); });
  };

  // 2. API GỌI DỮ LIỆU THEO NHÂN VIÊN
  const fetchByUser = (e) => {
    if (e) e.preventDefault();
    if (!searchUsername.trim()) return;

    setLoading(true); setError(''); setDateData(null);
    fetch(`${BACKEND_URL}/api/admin/user-details?username=${searchUsername}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Không tìm thấy nhân viên này!');
        return res.json();
      })
      .then(data => { setUserData(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  // Tự động load dữ liệu ngày khi chuyển tab hoặc đổi ngày
  useEffect(() => {
    if (viewMode === 'date') fetchByDate();
  }, [selectedDate, viewMode]);

  const totalWaterInDay = dateData?.data?.reduce((sum, item) => sum + item.volume_ml, 0) || 0;

  return (
    <div className="dashboard">
      
      {/* HEADER ĐỒNG BỘ VỚI TRANG DASHBOARD */}
      <header className="top-bar">
        <img src={waterLogo} alt="Water logo" className="top-bar-logo" />
        <span className="top-bar-title">Quản trị Hệ thống</span>
        <button onClick={onLogout} className="logout-button">Đăng xuất</button>
      </header>

      <div className="dashboard-inner admin-inner">
        {/* THANH ĐIỀU HƯỚNG TABS */}
        <div className="admin-tabs">
          <button className={`admin-tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => setViewMode('date')}>
            🗓️ Theo ngày
          </button>
          <button className={`admin-tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => setViewMode('user')}>
            👤 Nhân viên
          </button>
        </div>

        <main className="dashboard-main">
          {/* ========================================================= */}
          {/* GIAO DIỆN TAB 1: THEO NGÀY                                  */}
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
                  <h2 className="admin-section-title">Nhật ký ngày {selectedDate}</h2>
                  {dateData.data.length === 0 ? (
                    <div className="admin-empty-state">Không có lượt check-in nào.</div>
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
          {/* GIAO DIỆN TAB 2: THEO NHÂN VIÊN                             */}
          {/* ========================================================= */}
          {viewMode === 'user' && (
            <div className="admin-section">
              <form className="admin-search-form" onSubmit={fetchByUser}>
                <input 
                  type="text" 
                  placeholder="Nhập username..." 
                  value={searchUsername} 
                  onChange={(e) => setSearchUsername(e.target.value)}
                  className="admin-search-input"
                />
                <button type="submit" className="admin-search-btn">Tìm</button>
              </form>

              {loading && <div className="admin-status-text">🔄 Đang trích xuất hồ sơ...</div>}
              {error && <div className="admin-status-text error">❌ {error}</div>}

              {!loading && !error && userData && (
                <>
                  <div className="admin-profile-card">
                    <h2 className="admin-profile-name">@{userData.username}</h2>
                    <div className="admin-profile-stats">
                      <div className="admin-p-stat"><span>🔥 Streak:</span> <strong>{userData.streak} ngày</strong></div>
                      <div className="admin-p-stat"><span>💧 Tổng nước:</span> <strong>{userData.total_volume} ml</strong></div>
                      <div className="admin-p-stat"><span>📸 Check-in:</span> <strong>{userData.total_checkins} lần</strong></div>
                    </div>
                  </div>

                  <div className="admin-log-container">
                    <h2 className="admin-section-title">Lịch sử ảnh cá nhân</h2>
                    {userData.history.length === 0 ? (
                      <div className="admin-empty-state">Nhân viên này chưa uống nước.</div>
                    ) : (
                      <div className="admin-grid-cards">
                        {userData.history.map((item) => (
                          <div key={item.checkin_id} className="admin-card">
                            <div className="admin-card-header">
                              <span className="admin-card-time" style={{margin:0}}>🕒 {item.time}</span>
                              <span className="admin-volume-tag">+{item.volume_ml}ml</span>
                            </div>
                            <div className="admin-image-box" style={{ marginTop: '10px' }}>
                              {item.image_link !== "Không có ảnh" ? (
                                <a href={`${BACKEND_URL}${item.image_link}`} target="_blank" rel="noreferrer">
                                  <img src={`${BACKEND_URL}${item.image_link}`} alt="Check-in" loading="lazy" />
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