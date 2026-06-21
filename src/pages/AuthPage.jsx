import { useState } from 'react';
import './AuthPage.css';

const API_BASE = 'https://lovely-vans-follow.loca.lt';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin]       = useState(true);
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };

  const handleRegister = async () => {
    setLoading(true);
    resetMessages();
    try {
      // Đăng ký thì thường Backend sẽ nhận dạng JSON
      const res = await fetch(`${API_BASE}/api/register`, { // Đổi thành /register
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true' // Bùa xuyên tường
        },
        body: JSON.stringify({ username, password }), // Gửi dạng JSON
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Đăng ký thất bại');
      setSuccess('Đăng ký thành công! Hãy đăng nhập.');
      setIsLogin(true);
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    resetMessages();
    try {
      // Đăng nhập của FastAPI OAuth2 bắt buộc dùng URLSearchParams
      const formBody = new URLSearchParams({ username, password });
      
      const res = await fetch(`${API_BASE}/api/login`, { // Chuẩn /login
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'bypass-tunnel-reminder': 'true' // Đã thêm bùa xuyên tường vào đây
        },
        body: formBody.toString(),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Đăng nhập thất bại');
      localStorage.setItem('token', data.access_token);
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (isLogin) handleLogin(); else handleRegister();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">💧</div>
          <h1 className="auth-title">Water Tracker</h1>
          <p className="auth-subtitle">
            {isLogin ? 'Đăng nhập để bắt đầu' : 'Tạo tài khoản mới'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-msg auth-msg--error">{error}</div>}
          {success && <div className="auth-msg auth-msg--success">{success}</div>}

          <div className="auth-field">
            <label className="auth-label">Tên đăng nhập</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Nhập username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Mật khẩu</label>
            <input
              type="password"
              className="auth-input"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button
            className="auth-toggle-btn"
            onClick={() => { setIsLogin(!isLogin); resetMessages(); }}
          >
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}
