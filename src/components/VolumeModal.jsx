import { useState, useRef, useCallback, useEffect } from 'react';
import './VolumeModal.css';

const CONTAINER_LABELS = {
  glass:   'Ly thủy tinh',
  mug:     'Cốc có quai cầm',
  thermos: 'Bình giữ nhiệt',
  bottle:  'Chai nước lọc',
};
const CONTAINER_H = { glass: 135, mug: 120, thermos: 170, bottle: 200 };

export default function VolumeModal({ containerType, selectedVolume, maxVolume, onVolumeChange, onConfirm, onClose }) {
  const label      = CONTAINER_LABELS[containerType] ?? 'Vật chứa nước';
  const contH      = CONTAINER_H[containerType] ?? 135;
  const waterH     = maxVolume > 0 ? (selectedVolume / maxVolume) * contH : 0;

  const dragRef    = useRef(null);
  const startY     = useRef(0);
  const startVol   = useRef(selectedVolume);
  const isDragging = useRef(false);

  const clampVol = useCallback((v) => Math.min(Math.max(Math.round(v / 10) * 10, 10), maxVolume), [maxVolume]);

  const onPointerDown = useCallback((e) => {
    isDragging.current = true;
    startY.current   = e.clientY ?? e.touches?.[0]?.clientY;
    startVol.current = selectedVolume;
    e.preventDefault();
  }, [selectedVolume]);

  useEffect(() => {
    const move = (e) => {
      if (!isDragging.current) return;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      const dy = y - startY.current;
      const delta = -(dy / contH) * maxVolume;
      onVolumeChange(clampVol(startVol.current + delta));
    };
    const up = () => { isDragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend',  up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
      window.removeEventListener('touchmove', move, { passive: true }); // ← phải khớp options
      window.removeEventListener('touchend',  up);
      isDragging.current = false; // ← đảm bảo dừng drag khi unmount
    };
  }, [contH, maxVolume, onVolumeChange, clampVol]);

  return (
    <div className="vol-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vol-card">
        <h3 className="vol-title">{label}</h3>
        <p className="vol-amount">
          <span className="vol-amount-big">{selectedVolume}</span>
          <span className="vol-amount-max"> / {maxVolume} ml</span>
        </p>

        {/* Container visualization */}
        <div className="vol-vis">
          <div className="vol-container-wrap">
            {/* Top parts */}
            {containerType === 'thermos' && (
              <div className="vol-top vol-top--thermos">
                <div className="thermos-cap" />
                <div className="thermos-neck" />
              </div>
            )}
            {containerType === 'bottle' && (
              <div className="vol-top vol-top--bottle">
                <div className="bottle-cap" />
                <div className="bottle-neck" />
              </div>
            )}
            {containerType === 'mug' && <div className="mug-handle" />}

            {/* Main body */}
            <div className={`vol-body vol-body--${containerType || 'glass'}`} style={{ height: contH }}>
              <div className="vol-water" style={{ height: waterH }} />
              <span className="vol-water-icon">💧</span>
            </div>

            {/* Drag handle */}
            <div
              ref={dragRef}
              className="vol-dragger"
              style={{ bottom: Math.max(0, waterH - 20) }}
              onMouseDown={onPointerDown}
              onTouchStart={onPointerDown}
            >
              <div className="vol-knob"><div className="vol-knob-inner" /></div>
              <div className="vol-line" />
            </div>
          </div>
          <p className="vol-hint">Kéo lên/xuống để điều chỉnh</p>
        </div>

        <button className="vol-confirm-btn" onClick={onConfirm}>Xác nhận uống 💧</button>
        <button className="vol-cancel-btn"  onClick={onClose}>Hủy</button>
      </div>
    </div>
  );
}
