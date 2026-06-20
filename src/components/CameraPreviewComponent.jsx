import { useRef, useEffect, useState } from 'react';
import './CameraPreviewComponent.css';

export default function CameraPreviewComponent({ capturedImage, aiStatus, onCapture, onRetry, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const fileRef     = useRef(null);
  const [camError,  setCamError]  = useState(null);
  const [videoReady, setVideoReady] = useState(false);

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
    };
  }, [capturedImage]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
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
