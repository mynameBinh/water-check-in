import { useState, useEffect, useCallback, useRef } from 'react';
import HeaderComponent      from '../components/HeaderComponent';
import MainActionButton     from '../components/MainActionButtonComponent';
import CameraPreview        from '../components/CameraPreviewComponent';
import HistoryComponent     from '../components/HistoryComponent';
import FeedbackToast        from '../components/FeedbackToastComponent';
import VolumeModal          from '../components/VolumeModal';
import './DashboardPage.css';

const API_BASE = 'https://binhhn21-water-check-in-backend.hf.space';

function decodeJWT(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); }
  catch { return null; }
}

function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(',')[1]);
  const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

export default function DashboardPage({ token, onLogout }) {
  // ── Core state ────────────────────────────────────────────────────────────
  const [currentWater,   setCurrentWater]   = useState(0);
  const [goalMl,         setGoalMl]         = useState(1800);
  const [username,       setUsername]       = useState('');
  const [streak,         setStreak]         = useState(0);
  const [completedDates, setCompletedDates] = useState([]);
  const [history,        setHistory]        = useState([]);
  const [toast,          setToast]          = useState(null);

  // ── Camera / AI state ─────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage,  setCapturedImage]  = useState(null);
  const [aiStatus,       setAiStatus]       = useState('idle'); // idle | loading | success | error

  // ── Volume modal state ────────────────────────────────────────────────────
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [selectedVolume,  setSelectedVolume]  = useState(250);
  const [maxVolume,       setMaxVolume]       = useState(250);
  const [containerType,   setContainerType]   = useState('unknown');
  const pendingImageUrl = useRef(''); // lưu image_url từ /api/checkin để gửi khi confirm

  // ── Show toast helper ─────────────────────────────────────────────────────
  const showToast = useCallback((type, message) => {
    setToast({ type, message, key: Date.now() });
  }, []);

  // ── Load initial data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const payload = decodeJWT(token);
    if (payload?.sub) setUsername(payload.sub);

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/me`,      { headers }),
      fetch(`${API_BASE}/api/history`, { headers }),
      fetch(`${API_BASE}/api/streak`,  { headers }),
    ]).then(async ([meRes, histRes, stRes]) => {
      if (meRes.ok) {
        const me = await meRes.json();
        setGoalMl(me.daily_goal ?? 1800);
      }
      if (stRes.ok) {
        const st = await stRes.json();
        setStreak(st.streak ?? 0);
        setCompletedDates(st.completed_dates ?? []);
      }
      if (histRes.ok) {
        const hData = await histRes.json();
        setHistory(hData.map(item => ({
          id:     item.id,
          time:   new Date(item.timestamp.endsWith('Z') ? item.timestamp : item.timestamp+'Z')
                    .toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }),
          volume: item.volume_ml,
        })));
        setCurrentWater(hData.reduce((s, i) => s + i.volume_ml, 0));
      }
    }).catch(() => {});
  }, [token]);

  // ── Camera handlers ───────────────────────────────────────────────────────
  const handleOpenCamera = useCallback(() => {
    setCapturedImage(null);
    setAiStatus('idle');
    setIsCameraActive(true);
  }, []);

  const handleCapture = useCallback(async (imageDataUrl) => {
    setCapturedImage(imageDataUrl);
    setAiStatus('loading');
    try {
      const blob = dataURItoBlob(imageDataUrl);
      const form = new FormData();
      form.append('image', blob, 'checkin.jpeg');
      const res = await fetch(`${API_BASE}/api/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail?.message || err.detail || 'Check-in thất bại');
      }
      const data = await res.json();
      const vol = Math.max(data.max_volume || 250, 10);
      pendingImageUrl.current = data.image_url || ''; // lưu để gửi kèm khi confirm
      setMaxVolume(vol);
      setSelectedVolume(vol);
      setContainerType(data.container_type || 'unknown');
      setAiStatus('success');
      // Đóng camera, mở volume modal
      setTimeout(() => {
        setIsCameraActive(false);
        setCapturedImage(null);
        setAiStatus('idle');
        setShowVolumeModal(true);
      }, 600);
    } catch (err) {
      setAiStatus('error');
      showToast('error', err.message || 'Lỗi khi check-in');
    }
  }, [token, showToast]);

  const handleConfirmVolume = useCallback(async () => {
    // Optimistic UI update ngay lập tức
    const confirmedVol = selectedVolume;
    setShowVolumeModal(false);
    setCurrentWater(prev => prev + confirmedVol);
    setHistory(prev => [{
      id:     Date.now(),
      time:   new Date().toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }),
      volume: confirmedVol,
    }, ...prev]);

    // Gửi volume thực lên backend — lưu DB với đúng số ml user đã chọn
    try {
      const res = await fetch(`${API_BASE}/api/checkin/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ volume_ml: confirmedVol, image_url: pendingImageUrl.current }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      showToast('success', `Check-in thành công ${confirmedVol}ml nước! 💧`);
    } catch (err) {
      console.warn('[checkin/confirm] thất bại:', err.message);
      // Lưu DB thất bại — rollback UI
      setCurrentWater(prev => prev - confirmedVol);
      setHistory(prev => prev.slice(1));
      showToast('error', 'Không thể lưu check-in lên server, vui lòng thử lại.');
    }
  }, [selectedVolume, token, showToast]);

  return (
    <div className="dashboard">
      {/* ── TOP BAR ── */}
      <header className="top-bar">
        <span className="top-bar-logo">💧</span>
        <span className="top-bar-title">Water Check-in</span>
        <button className="logout-btn" onClick={() => {
          if (window.confirm('Đăng xuất tài khoản này ư?')) onLogout();
        }}>Đăng xuất</button>
      </header>

      {/* ── CONTENT ── */}
      <div className="dashboard-content">
        <div className="home-tab">
          <HeaderComponent
            currentWater={currentWater}
            goalMl={goalMl}
            username={username}
            streak={streak}
            completedDates={completedDates}
          />
          <MainActionButton
            onOpen={handleOpenCamera}
            disabled={aiStatus === 'loading'}
          />
          {isCameraActive && (
            <CameraPreview
              capturedImage={capturedImage}
              aiStatus={aiStatus}
              onCapture={handleCapture}
              onRetry={() => { setCapturedImage(null); setAiStatus('idle'); }}
              onClose={() => { setIsCameraActive(false); setCapturedImage(null); setAiStatus('idle'); }}
            />
          )}
          <HistoryComponent history={history} />
        </div>
      </div>

      {/* ── VOLUME MODAL ── */}
      {showVolumeModal && (
        <VolumeModal
          containerType={containerType}
          selectedVolume={selectedVolume}
          maxVolume={maxVolume}
          onVolumeChange={setSelectedVolume}
          onConfirm={handleConfirmVolume}
          onClose={() => setShowVolumeModal(false)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && <FeedbackToast key={toast.key} toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
