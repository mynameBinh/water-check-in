import React, { useState, useEffect } from 'react';
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
    <div className="admin-container">
      
      {/* HEADER CỦA TRANG ADMIN */}
      <div className="admin-header">
        <div className="admin-title">
          <h1>👑 BẢNG ĐIỀU KHIỂN CỦA SẾP</h1>
          <p>Quản lý lịch sử check-in và hình ảnh của toàn bộ hệ thống</p>
        </div>
        <button onClick={onLogout} className="logout-btn-admin">Đăng xuất</button>
      </div>

      {/* THANH ĐIỀU HƯỚNG TABS */}
      <div className="tab-container">
        <button className={`tab-btn ${viewMode === 'date' ? 'active' : ''}`} onClick={() => setViewMode('date')}>
          🗓️ Tình hình theo ngày
        </button>
        <button className={`tab-btn ${viewMode === 'user' ? 'active' : ''}`} onClick={() => setViewMode('user')}>
          👤 Hồ sơ nhân viên
        </button>
      </div>

      {/* ========================================================= */}
      {/* GIAO DIỆN TAB 1: THEO NGÀY (CŨ)                            */}
      {/* ========================================================= */}
      {viewMode === 'date' && (
        <div className="tab-content">
          <div className="filter-bar">
            <span>Chọn ngày xem:</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-input"/>
          </div>

          <div className="stats-grid">
            <div className="stat-card blue">
              <p className="stat-label">TỔNG SỐ LƯỢT CHECK-IN</p>
              <p className="stat-value">{dateData?.total_checkins || 0} lần</p>
            </div>
            <div className="stat-card green">
              <p className="stat-label">TỔNG LƯỢNG NƯỚC TIÊU THỤ</p>
              <p className="stat-value green">{totalWaterInDay} ml</p>
            </div>
          </div>

          {loading && <p className="loading-text">🔄 Đang tải dữ liệu ngày...</p>}
          {error && <p className="error-text">❌ {error}</p>}

          {!loading && !error && dateData && (
            <div className="log-card-container">
              <h2>📸 Nhật ký ngày {selectedDate}</h2>
              {dateData.data.length === 0 ? (
                <p className="no-data-text">Không có ai uống nước vào ngày này.</p>
              ) : (
                <div className="grid-cards">
                  {dateData.data.map((item) => (
                    <div key={item.checkin_id} className="user-checkin-card">
                      <div className="card-top">
                        <b className="user-name">👤 {item.username}</b>
                        <span className="volume-tag">+{item.volume_ml}ml</span>
                      </div>
                      <p className="time-text">🕒 {item.time}</p>
                      <div className="image-box">
                        {item.image_link_click_here !== "Không có ảnh" ? (
                          <a href={`${BACKEND_URL}${item.image_link_click_here}`} target="_blank" rel="noreferrer">
                            <img src={`${BACKEND_URL}${item.image_link_click_here}`} alt="Check-in" className="checkin-img" />
                          </a>
                        ) : (<div className="no-img-placeholder">🚫 Không có ảnh</div>)}
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
      {/* GIAO DIỆN TAB 2: THEO TỪNG NHÂN VIÊN                        */}
      {/* ========================================================= */}
      {viewMode === 'user' && (
        <div className="tab-content">
          <form className="filter-bar search-form" onSubmit={fetchByUser}>
            <input 
              type="text" 
              placeholder="Nhập tên đăng nhập nhân viên cần xem..." 
              value={searchUsername} 
              onChange={(e) => setSearchUsername(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">🔍 Tìm kiếm</button>
          </form>

          {loading && <p className="loading-text">🔄 Đang trích xuất hồ sơ...</p>}
          {error && <p className="error-text">❌ {error}</p>}

          {!loading && !error && userData && (
            <>
              {/* THẺ THÔNG TIN TỔNG QUAN NHÂN VIÊN */}
              <div className="user-profile-header">
                <div className="profile-info">
                  <h2>Hồ sơ nhân viên: <span style={{color: '#38bdf8'}}>@{userData.username}</span></h2>
                </div>
                <div className="profile-stats">
                  <div className="p-stat"><span>🔥 Chuỗi Streak:</span> <b>{userData.streak} ngày</b></div>
                  <div className="p-stat"><span>💧 Tổng nước uống:</span> <b>{userData.total_volume} ml</b></div>
                  <div className="p-stat"><span>📸 Lần check-in:</span> <b>{userData.total_checkins} lần</b></div>
                </div>
              </div>

              {/* LỊCH SỬ HÌNH ẢNH CỦA NHÂN VIÊN NÀY */}
              <div className="log-card-container">
                <h2>📸 Toàn bộ lịch sử hình ảnh của {userData.username}</h2>
                {userData.history.length === 0 ? (
                  <p className="no-data-text">Nhân viên này chưa check-in lần nào.</p>
                ) : (
                  <div className="grid-cards">
                    {userData.history.map((item) => (
                      <div key={item.checkin_id} className="user-checkin-card">
                        <div className="card-top">
                          <span className="volume-tag">+{item.volume_ml}ml</span>
                          <span className="time-text">🕒 {item.time}</span>
                        </div>
                        <div className="image-box" style={{ marginTop: '10px' }}>
                          {item.image_link !== "Không có ảnh" ? (
                            <a href={`${BACKEND_URL}${item.image_link}`} target="_blank" rel="noreferrer">
                              <img src={`${BACKEND_URL}${item.image_link}`} alt="Check-in" className="checkin-img" />
                            </a>
                          ) : (<div className="no-img-placeholder">🚫 Không có ảnh</div>)}
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
    </div>
  );
}