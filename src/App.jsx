import { useState, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Đồng bộ token từ localStorage khi khởi tạo hoặc khi storage thay đổi
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return <DashboardPage token={token} onLogout={handleLogout} />;
}
