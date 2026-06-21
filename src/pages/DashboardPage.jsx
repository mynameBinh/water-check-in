import { useState, useEffect, useCallback } from 'react';
import waterLogo from '../assets/water.svg';
import HeaderComponent from '../components/HeaderComponent';
import MainActionButtonComponent from '../components/MainActionButtonComponent';
import CameraPreviewComponent from '../components/CameraPreviewComponent';
import FeedbackToastComponent from '../components/FeedbackToastComponent';
import HistoryComponent from '../components/HistoryComponent';
import './DashboardPage.css';

const API_BASE = 'https://eager-kings-wave.loca.lt';
const GOAL_ML = 1800;
const CHECKIN_ML = 250;

export default function DashboardPage({ token, onLogout }) {
  const [currentWater, setCurrentWater]   = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiStatus, setAiStatus]           = useState('idle');
  const [history, setHistory]             = useState([]);
  const [toast, setToast]                 = useState(null);

  /* Auto-dismiss toast after 3 s */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* Fetch history on mount */
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/history`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401) onLogout(); // Token expired or invalid
          throw new Error('Không lấy được lịch sử.');
        }
        const data = await res.json();
        setHistory(data.map(item => ({
          id: item.id,
          time: new Date(item.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit', minute: '2-digit', hour12: true,
          }),
          volume: item.volume_ml,
          status: 'success', // Backend doesn't store status, assume success for history
        })));
        // Calculate currentWater from history
        const totalWater = data.reduce((sum, item) => sum + item.volume_ml, 0);
        setCurrentWater(totalWater);
      } catch (err) {
        console.error("Lỗi khi tải lịch sử: ", err);
        setToast({ type: 'error', message: err.message || 'Không tải được lịch sử.' });
      }
    };
    fetchHistory();
  }, [token, onLogout]);

  const handleOpenCamera = () => {
    setCapturedImage(null);
    setAiStatus('idle');
    setIsCameraActive(true);
  };

  const handleCapture = useCallback(async (imageDataUrl) => {
    setCapturedImage(imageDataUrl);
    setAiStatus('loading');

    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const formData = new FormData();
      formData.append('image', blob, 'checkin.jpeg');

      const res = await fetch(`${API_BASE}/api/checkin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) onLogout(); // Token expired or invalid
        throw new Error(data.detail.message || 'Check-in thất bại.');
      }

      setCurrentWater(prev => Math.min(prev + CHECKIN_ML, GOAL_ML));
      setHistory(prev => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', hour12: true,
        }),
        volume: CHECKIN_ML,
        status: 'success',
      }, ...prev]);
      setAiStatus('success');
      setToast({ type: 'success', message: data.message });
      setIsCameraActive(false);
      setCapturedImage(null);

    } catch (err) {
      setAiStatus('error');
      setToast({ type: 'error', message: err.message || 'Lỗi khi check-in.' });
    }
  }, [token, onLogout]);

  const handleRetry = () => {
    setCapturedImage(null);
    setAiStatus('idle');
  };

  const handleCloseCamera = () => {
    setIsCameraActive(false);
    setCapturedImage(null);
    setAiStatus('idle');
  };

  return (
    <div className="dashboard">
      <header className="top-bar">
        <img src={waterLogo} alt="Water logo" className="top-bar-logo" />
        <span className="top-bar-title">Check-in uống nước</span>
        <button onClick={onLogout} className="logout-button">Đăng xuất</button>
      </header>

      <div className="dashboard-inner">
        <HeaderComponent currentWater={currentWater} goalMl={GOAL_ML} />

        <main className="dashboard-main">
          <MainActionButtonComponent
            onOpen={handleOpenCamera}
            isCameraActive={isCameraActive}
          />

          {isCameraActive && (
            <CameraPreviewComponent
              capturedImage={capturedImage}
              aiStatus={aiStatus}
              onCapture={handleCapture}
              onRetry={handleRetry}
              onClose={handleCloseCamera}
            />
          )}

          <HistoryComponent history={history} />
        </main>
      </div>

      {toast && <FeedbackToastComponent key={toast.message + Date.now()} toast={toast} />}
    </div>
  );
}
