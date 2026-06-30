import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // Không có token -> Đá về trang login
    return <Navigate to="/login" replace />;
  }

  try {
    // Bóc tách token xem role là gì
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));

    // Token đã hết hạn -> dọn token cũ và đá về login
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token');
      return <Navigate to="/login" replace />;
    }

    // Nếu không phải admin -> Đá về trang chủ user hoặc báo lỗi
    if (payload.role !== 'admin') {
      return <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>
        <h2>⚠️ LỖI 403: Bạn không có quyền truy cập khu vực Admin!</h2>
      </div>;
    }
  } catch (error) {
    return <Navigate to="/login" replace />;
  }

  // Hợp lệ thì cho phép đi tiếp vào trang AdminDashboard
  return children;
}