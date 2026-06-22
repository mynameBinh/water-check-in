import './MainActionButtonComponent.css';

export default function MainActionButtonComponent({ onOpen, isCameraActive }) {
  return (
    <div className="main-action-wrapper">
      <button
        className={`main-action-btn${isCameraActive ? ' main-action-btn--active' : ''}`}
        onClick={onOpen}
        aria-label="Chụp ảnh uống nước"
      >
        <span className="main-action-pulse" aria-hidden="true" />
        <span className="main-action-pulse main-action-pulse--delay" aria-hidden="true" />
        <span className="main-action-icon"><img src="/camera.png" alt="icon" id='camera-icon'/></span>
      </button>
      <p className="main-action-label">CHỤP ẢNH UỐNG NƯỚC</p>
    </div>
  );
}
