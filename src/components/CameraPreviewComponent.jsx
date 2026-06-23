import { useRef, useEffect, useState } from 'react';
import './CameraPreviewComponent.css';

export default function CameraPreviewComponent({ capturedImage, aiStatus, onCapture, onRetry, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const fileRef     = useRef(null);
  const [camError,  setCamError]  = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  
  // ⚡ MẸO THÊM: Quản lý trạng thái đèn Flash
  const [hasFlash, setHasFlash] = useState(false); // Thiết bị có hỗ trợ Flash không
  const [isFlashOn, setIsFlashOn] = useState(false); // Trạng thái bật/tắt hiện tại

  /* Start camera when panel opens and no image is captured yet */
  useEffect(() => {
    if (capturedImage) return;

    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // 🔍 KIỂM TRA XEM CAMERA CÓ ĐÈN FLASH KHÔNG
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities();
          // Nếu trình duyệt báo có tính năng 'torch' (đèn pin/flash)
          if (capabilities && 'torch' in capabilities) {
            setHasFlash(true);
          }
        }

      } catch (err) {
        if (active) setCamError(err.message || 'Không truy cập được camera');
      }
    };

    start();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setVideoReady(false);
      setHasFlash(false);
      setIsFlashOn(false);
    };
  }, [capturedImage]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsFlashOn(false);
  };

  // ⚡ HÀM BẬT / TẮT FLASH
  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !hasFlash) return;

    try {
      const nextFlashState = !isFlashOn;
      // Ép camera áp dụng cấu hình bật/tắt đèn torch
      await track.applyConstraints({
        advanced: [{ torch: nextFlashState }]
      });
      setIsFlashOn(nextFlashState);
    } catch (err) {
      console.error("Không thể điều khiển đèn Flash:", err);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !videoReady) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stopStream();
    onCapture(canvas.toDataURL('image/jpeg', 0.85));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCapture(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="cam-card">
      <div className="cam-frame">
        {/* ---- Live camera or file fallback ---- */}
        {!capturedImage && (
          <>
            {camError ? (
              <div className="cam-error-state">
                <span className="cam-error-icon">📷</span>
                <p className="cam-error-title">Camera không khả dụng</p>
                <p className="cam-error-hint">{camError}</p>
                <label className="upload-label">
                  📁 Chọn ảnh từ máy
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
                </label>
              </div>
            ) : (
              <>
                {!videoReady && (
                  <div className="cam-loading">
                    <div className="spinner" />
                    <p>Đang khởi động camera…</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onCanPlay={() => setVideoReady(true)}
                  className={`cam-video${videoReady ? ' cam-video--ready' : ''}`}
                />

                {/* ⚡ NÚT BẬT/TẮT FLASH (Chỉ hiện khi camera đã sẵn sàng và thiết bị CÓ flash) */}
                {videoReady && hasFlash && (
                  <button 
                    className={`flash-btn ${isFlashOn ? 'flash-btn--on' : ''}`} 
                    onClick={toggleFlash}
                    aria-label="Bật tắt đèn Flash"
                  >
                    {isFlashOn ?  <img src="/flash-on.png" alt="icon" className='flash-icon'/> : <img src="/flash-off.png" alt="icon" className='flash-icon'/>}
                  </button>
                )}

                {videoReady && (
                  <button className="shutter-btn" onClick={handleCapture} aria-label="Chụp ảnh">
                    <span className="shutter-inner" />
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ---- Captured image view ---- */}
        {capturedImage && (
          <>
            <img src={capturedImage} alt="Ảnh đã chụp" className="captured-img" />

            {aiStatus === 'loading' && (
              <div className="ai-overlay">
                <div className="spinner spinner--lg" />
                <p className="ai-overlay-text">AI đang soi… 🔍</p>
              </div>
            )}

            {aiStatus === 'error' && (
              <div className="ai-overlay ai-overlay--dim">
                <button className="retry-btn" onClick={onRetry}>🔄 Thử lại</button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="cam-frame-label">Khung Preview Camera / Ảnh đã chụp</p>

      <button className="close-cam-btn" onClick={onClose}>✕ Đóng camera</button>
    </div>
  );
}