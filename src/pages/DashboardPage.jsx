import { useState, useEffect, useCallback } from 'react';
import waterLogo from '../assets/water.svg';
import HeaderComponent from '../components/HeaderComponent';
import MainActionButtonComponent from '../components/MainActionButtonComponent';
import CameraPreviewComponent from '../components/CameraPreviewComponent';
import FeedbackToastComponent from '../components/FeedbackToastComponent';
import HistoryComponent from '../components/HistoryComponent';
import './DashboardPage.css';

const API_BASE = 'https://binhhn21-water-check-in-backend.hf.space';
const CHECKIN_ML = 250;

// 👇 HÀM CHUYỂN ĐỔI ẢNH (Trị dứt điểm lỗi String did not match trên điện thoại)
const dataURItoBlob = (dataURI) => {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

export default function DashboardPage({ token, onLogout }) {
  const [currentWater, setCurrentWater]     = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage]   = useState(null);
  const [aiStatus, setAiStatus]             = useState('idle');
  const [history, setHistory]               = useState([]);
  const [toast, setToast]                   = useState(null);

  // username greeting
  const [username, setUsername] = useState('sếp');

  // daily_goal linh hoạt cho từng người
  const [goalMl, setGoalMl] = useState(1750);

  // Giải mã token để lấy username (ID) ngay khi vừa vào trang
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.sub); 
      } catch (err) {
        console.error("Lỗi đọc token:", err);
      }
    }
  }, [token]);

  /* Auto-dismiss toast after 3s */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ✅ ĐÃ TỐI ƯU: Sử dụng Promise.all để gọi song song 2 API giúp load trang nhanh gấp đôi và đồng bộ hoàn hảo
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/history`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'bypass-tunnel-reminder': 'true' 
            },
          })
        ]);

        // 1. XỬ LÝ DỮ LIỆU PROFILE (DAILY GOAL)
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData && profileData.daily_goal) {
            setGoalMl(profileData.daily_goal);
          }
        } else {
          console.error("Không lấy được mục tiêu nước từ profile");
        }

        // 2. XỬ LÝ DỮ LIỆU LỊCH SỬ CHECK-IN
        if (!historyRes.ok) {
          if (historyRes.status === 401 || historyRes.status === 403) {
            onLogout();
            return;
          }
          throw new Error('Server không phản hồi lịch sử.');
        }
        
        const historyData = await historyRes.json();
        setHistory(historyData.map(item => {
          const fixedTimestamp = item.timestamp.endsWith('Z') 
            ? item.timestamp 
            : `${item.timestamp}Z`;

          return {
            id: item.id,
            time: new Date(fixedTimestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit', minute: '2-digit', hour12: true,
            }),
            volume: item.volume_ml,
            status: 'success', 
          };
        }));
        
        const totalWater = historyData.reduce((sum, item) => sum + item.volume_ml, 0);
        setCurrentWater(totalWater);
        
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu ban đầu: ", err);
        setToast({ type: 'error', message: 'Mất kết nối Server! Vui lòng đăng nhập lại...' });
        setTimeout(() => {
          onLogout();
        }, 1500); 
      }
    };
    
    if (token) {
      fetchData();
    }
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
      const blob = dataURItoBlob(imageDataUrl);
      
      const formData = new FormData();
      formData.append('image', blob, 'checkin.jpeg');

      const res = await fetch(`${API_BASE}/api/checkin`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
        },
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          onLogout();
          return;
        }
        const errData = await res.json();
        throw new Error(errData.detail?.message || errData.detail || 'Check-in thất bại.');
      }

      const data = await res.json();

      // Cập nhật nước dùng biến goalMl (thêm mục tiêu)
      setCurrentWater(prev => Math.min(prev + CHECKIN_ML, goalMl));
      
      setHistory(prev => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit', hour12: true,
        }),
        volume: CHECKIN_ML,
        status: 'success',
      }, ...prev]);
      
      setAiStatus('success');
      setToast({ type: 'success', message: data.message || 'Check-in thành công!' });
      
      setTimeout(() => {
        setIsCameraActive(false);
        setCapturedImage(null);
        setAiStatus('idle');
      }, 1500);

    } catch (err) {
      setAiStatus('error');
      console.error("Lỗi kết nối Check-in: ", err);
      
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setToast({ type: 'error', message: 'Máy chủ đang bảo trì! Đang văng ra...' });
        setTimeout(() => {
          onLogout();
        }, 1500);
      } else {
        setToast({ type: 'error', message: err.message || 'Lỗi khi check-in.' });
      }
    }
  }, [token, onLogout, goalMl]); // Đưa goalMl vào dependency để React lấy đúng mục tiêu mới

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
        <HeaderComponent currentWater={currentWater} goalMl={goalMl} username={username}/>

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