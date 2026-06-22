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
  const [currentWater, setCurrentWater]   = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiStatus, setAiStatus]           = useState('idle');
  const [history, setHistory]             = useState([]);
  const [toast, setToast]                 = useState(null);

  //userName greeting
  const [username, setUsername]             = useState('sếp');

  // 👇 THÊM ĐOẠN NÀY: Giải mã token để lấy username (ID) ngay khi vừa vào trang
  useEffect(() => {
    if (token) {
      try {
        // Cắt khúc giữa của token và dịch nó ra tiếng người
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.sub); // Chữ "sub" chính là nơi Backend giấu tên username
      } catch (err) {
        console.error("Lỗi đọc token:", err);
      }
    }
  }, [token]);

  /* Auto-dismiss toast after 3 s */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* Fetch history on mount */
  /* Fetch history on mount */
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/history`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true' 
          },
        });
        
        // Nếu server từ chối (401 Hết token) hoặc sập ngầm
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            onLogout(); // Đá văng ngay lập tức
            return;
          }
          throw new Error('Server không phản hồi.');
        }
        
        const data = await res.json();
        setHistory(data.map(item => ({
          id: item.id,
          time: new Date(item.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit', minute: '2-digit', hour12: true,
          }),
          volume: item.volume_ml,
          status: 'success', 
        })));
        const totalWater = data.reduce((sum, item) => sum + item.volume_ml, 0);
        setCurrentWater(totalWater);
        
      } catch (err) {
        console.error("Lỗi khi tải lịch sử: ", err);
        // 👇 TỰ ĐỘNG ĐÁ VĂNG NẾU LỖI MẠNG / BACKEND SẬP
        setToast({ type: 'error', message: 'Mất kết nối Server! Vui lòng đăng nhập lại...' });
        setTimeout(() => {
          onLogout();
        }, 1500); // Trì hoãn 1.5 giây để user kịp đọc lý do trước khi bị văng
      }
    };
    
    if (token) {
      fetchHistory();
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
      // 👇 DÙNG HÀM MỚI THAY VÌ FETCH ĐỂ KHÔNG BỊ NGỘP CHUỖI TRÊN MOBILE
      const blob = dataURItoBlob(imageDataUrl);
      
      const formData = new FormData();
      formData.append('image', blob, 'checkin.jpeg');

      // ... (Phần trên giữ nguyên)
      const res = await fetch(`${API_BASE}/api/checkin`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
        },
        body: formData,
      });

      if (!res.ok) {
        // Kiểm tra mã 401 (Hết hạn đăng nhập)
        if (res.status === 401 || res.status === 403) {
          onLogout();
          return;
        }
        const data = await res.json();
        throw new Error(data.detail?.message || data.detail || 'Check-in thất bại.');
      }

      // ... (Phần cập nhật UI thành công giữ nguyên)

    } catch (err) {
      setAiStatus('error');
      console.error("Lỗi kết nối Check-in: ", err);
      
      // 👇 TỰ ĐỘNG ĐÁ VĂNG NẾU GẶP LỖI MẠNG (Failed to fetch)
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setToast({ type: 'error', message: 'Máy chủ đang bảo trì! Đang văng ra...' });
        setTimeout(() => {
          onLogout();
        }, 1500);
      } else {
        // Chỉ hiện lỗi bình thường nếu là lỗi do AI soi ra (không văng)
        setToast({ type: 'error', message: err.message || 'Lỗi khi check-in.' });
      }
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
        <HeaderComponent currentWater={currentWater} goalMl={GOAL_ML} username={username}/>

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