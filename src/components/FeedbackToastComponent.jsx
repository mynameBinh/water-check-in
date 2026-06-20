import { useEffect, useState } from 'react';
import './FeedbackToastComponent.css';

const DURATION = 3000;

export default function FeedbackToastComponent({ toast }) {
  const [bar, setBar] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const raf = () => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100);
      setBar(pct);
      if (pct > 0) requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, []);

  const ok = toast.type === 'success';

  return (
    <div className={`toast toast--${toast.type}`} role="alert" aria-live="assertive">
      <div className="toast-body">
        <span className="toast-icon">{ok ? '✅' : '❌'}</span>
        <div className="toast-text">
          <p className="toast-title">{ok ? 'Tuyệt vời!' : 'Không phải cốc nước'}</p>
          <p className="toast-msg">{toast.message}</p>
        </div>
      </div>
      <div className="toast-bar-track">
        <div className="toast-bar" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}
