import { useState, useEffect } from 'react';
import './HeaderComponent.css';

const R = 72;
const SW = 12;
const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;

function GlassIcon({ filled }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden="true">
      <path
        d="M2.5 1.5h13l-2 18h-9l-2-18z"
        fill={filled ? 'rgba(56,189,248,0.25)' : 'transparent'}
        stroke={filled ? '#38BDF8' : '#BAE6FD'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {filled && (
        <path d="M4.5 11 Q9 8.5 13.5 11" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
      )}
    </svg>
  );
}

function CircularProgress({ percentage, currentWater, goalMl }) {
  const offset = CIRC - (percentage / 100) * CIRC;
  const filledGlasses = Math.floor(currentWater / 250);
  const totalGlasses  = Math.ceil(goalMl / 250);

  return (
    <div className="progress-wrapper">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="progress-svg">
        <defs>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#4DD0E1" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#DCF0FB" strokeWidth={SW} />
        <circle
          cx={CX} cy={CY} r={R} fill="none" stroke="url(#waterGrad)" strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset} transform={`rotate(-90 ${CX} ${CY})`} filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
        />
        <text x={CX} y={CY - 14} textAnchor="middle" fill="#0C2340" fontSize="34" fontWeight="800">{percentage}%</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill="#38BDF8" fontSize="17" fontWeight="600">{currentWater}ml</text>
        <text x={CX} y={CY + 34} textAnchor="middle" fill="#94B4C5" fontSize="12">/ {goalMl}ml</text>
      </svg>
      <div className="glass-row">
        {Array.from({ length: totalGlasses }, (_, i) => (
          <GlassIcon key={i} filled={i < filledGlasses} />
        ))}
      </div>
    </div>
  );
}

export default function HeaderComponent({ currentWater, goalMl }) {
  const [userName, setUserName] = useState('sếp');
  const [streak, setStreak] = useState(0);
  
  // 👇 THÊM STATE: Lưu trạng thái bật banner chúc mừng cột mốc
  const [showCelebration, setShowCelebration] = useState(false);

  // Hàm bắn pháo hoa từ CDN
  const fireConfetti = () => {
    if (window.confetti) {
      window.confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
    } else if (!document.getElementById('confetti-cdn-script')) {
      // Nếu chưa load kịp thư viện thì tự động nạp ngầm rồi bắn luôn (chỉ nạp 1 lần)
      const script = document.createElement('script');
      script.id = 'confetti-cdn-script';
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      script.onload = () => window.confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
      document.head.appendChild(script);
    }
  };

 useEffect(() => {
    try {
      const token = localStorage.getItem('token'); 
      if (token) {
        // 1. Lấy tên User (decode an toàn với base64url)
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload && payload.sub) {
          setUserName(payload.sub);
        }

        const BACKEND_URL = "https://binhhn21-water-check-in-backend.hf.space";

        // 2. Gọi API lấy Streak
        fetch(`${BACKEND_URL}/api/streak`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.streak === 'number') {
            setStreak(data.streak);
            
            // 👇 KIỂM TRA CỘT MỐC THÔNG MINH
            const targetMilestones = [10, 50, 100, 200];
            const currentStreak = data.streak;
            
            // Lấy mốc streak đã từng chúc mừng từ bộ nhớ máy ra kiểm tra
            const lastCelebrated = Number(localStorage.getItem('celebrated_streak')) || 0;

            if (targetMilestones.includes(currentStreak) && currentStreak !== lastCelebrated) {
              setShowCelebration(true); // Bật banner chúc mừng
              fireConfetti();           // Bắn pháo hoa tung tóe
              
              // 📌 Ghi nhớ lại mốc này để các lần check-in sau trong cùng ngày không bị nổ pháo hoa nữa
              localStorage.setItem('celebrated_streak', currentStreak);
            }
          }
        })
        .catch(err => console.error("Lỗi lấy dữ liệu chuỗi ngày:", err));
      }
    } catch (err) {
      console.error("Lỗi xử lý Header:", err);
    }
  }, [currentWater]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const percentage = Math.min(100, Math.round((currentWater / goalMl) * 100));

  return (
    <header className="header-card" style={{ position: 'relative' }}>
      
      {/* 👇 BANNER CHÚC MỪNG NỔI LÊN MÀN HÌNH KHI ĐẠT MỐC */}
      {showCelebration && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#0F172A', color: '#FFF', padding: '16px 24px', borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          border: '2px solid #F59E0B', animation: 'slideDown 0.5s ease-out', width: '90%', maxWidth: '350px'
        }}>
          <span style={{ fontSize: '30px' }}>🏆</span>
          <b style={{ fontSize: '16px', color: '#F59E0B', textAlign: 'center' }}>ĐẲNG CẤP QUÁ SẾP ƠI!</b>
          <p style={{ margin: 0, fontSize: '14px', textAlign: 'center', color: '#E2E8F0' }}>
            Sếp đã xuất sắc duy trì chuỗi uống nước liên tục <b style={{ color: '#EF4444' }}>{streak} ngày</b>!
          </p>
          <button 
            onClick={() => setShowCelebration(false)}
            style={{
              marginTop: '8px', backgroundColor: '#F59E0B', color: '#000', border: 'none',
              padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
            }}
          >
            Tiếp tục phát huy 🚀
          </button>
        </div>
      )}

      <div className="header-top-row">
        <div>
          <p className="greeting">Chào {userName}! 👋</p>
          <p className="header-date">{dateStr}</p>
        </div>
        
        {/* 👇 HIỂN THỊ CHUỖI TỐI GIẢN: Chỉ có 1 icon lửa và số lần giữ đúng ý sếp */}
        {streak > 0 ? (
          <div className="header-streak" style={{ 
            fontSize: '20px', fontWeight: '800', color: '#EF4444', 
            display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' 
          }} onClick={fireConfetti}> {/* Sếp bấm tay vào ngọn lửa nó cũng tự bắn pháo hoa giải trí luôn */}
            🔥<span style={{ fontSize: '18px', color: '#334155' }}>{streak}</span>
          </div>
        ) : (
          <div className="header-drop" aria-hidden="true">💧</div>
        )}
      </div>

      <CircularProgress percentage={percentage} currentWater={currentWater} goalMl={goalMl} />

      {currentWater >= goalMl && (
        <p className="goal-reached">🎉 Đạt mục tiêu hôm nay!</p>
      )}
    </header>
  );
}