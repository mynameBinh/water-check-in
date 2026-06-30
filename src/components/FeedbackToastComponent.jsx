import { useEffect, useState } from 'react';
import './FeedbackToastComponent.css';

const DURATION = 3000;

export default function FeedbackToastComponent({ toast, onClose }) {
  const [bar, setBar] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const raf = () => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100);
      setBar(pct);
      if (pct > 0) requestAnimationFrame(raf);
      else onClose?.();
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [onClose]);

  const ICONS  = { success: '✅', error: '❌', info: 'ℹ️' };
  const TITLES = { success: 'Tuyệt vời!', error: 'Không phải nước lọc', info: 'Thông báo' };
  const type = ICONS[toast.type] ? toast.type : 'info';

  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="assertive">
      <div className="toast-body">
        <span className="toast-icon">{ICONS[type]}</span>
        <div className="toast-text">
          <p className="toast-title">{TITLES[type]}</p>
          <p className="toast-msg">{toast.message}</p>
        </div>
        <button className="toast-close" onClick={onClose} aria-label="Đóng thông báo">✕</button>
      </div>
      <div className="toast-bar-track">
        <div className="toast-bar" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}
