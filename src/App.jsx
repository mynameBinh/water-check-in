import { useState, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard'; // 👈 1. Nhập trang Admin của sếp vào đây

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // 👈 2. TẠO STATE THEO DÕI URL: Để biết sếp đang gõ "/" hay "/admin"
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
    };

    // Theo dõi nếu sếp bấm nút Back/Forward trên trình duyệt
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.href = '/'; // 👈 Đuổi về trang chủ khi logout
  };

  // -------------------------------------------------------------------------
  // KHU VỰC XỬ LÝ PHÂN QUYỀN VÀ CHIA TUYẾN ĐƯỜNG (ROUTING LOGIC)
  // -------------------------------------------------------------------------

  // BƯỚC A: Nếu chưa có Token -> Ép buộc phải ở trang Đăng nhập/Đăng ký
  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // BƯỚC B: Nếu đã có Token -> Giải mã ngầm lấy quyền hạn (Role) của User
  let userRole = 'user'; 
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userRole = payload.role || 'user'; // Lấy role từ token Backend cấp
  } catch (err) {
    console.error("Lỗi đọc thẻ căn cước (Token):", err);
  }

  // BƯỚC C: Kiểm tra tuyến đường nếu sếp muốn vào trang Admin
  if (currentPath === '/admin') {
    if (userRole === 'admin') {
      // Đúng là sếp -> Cho vào két dữ liệu
      return <AdminDashboard token={token} onLogout={handleLogout} />;
    } else {
      // Nhân viên đi lạc -> Chặn đứng, hiển thị thông báo lỗi 403
      return (
        <div style={{
          backgroundColor: '#0B1329', color: '#EF4444', minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', gap: '10px'
        }}>
          <h2 style={{ margin: 0 }}>⚠️ LỖI 403: KHU VỰC BẢO MẬT!</h2>
          <p style={{ color: '#94A3B8', margin: 0 }}>Tài khoản của bạn không có quyền Admin để vào đây.</p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: '#38BDF8', color: '#000', border: 'none', padding: '8px 16px',
              borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'
            }}
          >
            Quay lại trang chủ
          </button>
        </div>
      );
    }
  }

  // BƯỚC D: Mặc định nếu không gõ /admin thì trả về trang check-in nước bình thường
  return <DashboardPage token={token} onLogout={handleLogout} />;
}