import './MainActionButtonComponent.css';

export default function MainActionButtonComponent({ onOpen, isCameraActive, disabled = false }) {
  return (
    <div className="main-action-wrapper">
      <button
        className={`main-action-btn${isCameraActive ? ' main-action-btn--active' : ''}${disabled ? ' main-action-btn--disabled' : ''}`}
        onClick={disabled ? undefined : onOpen}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={disabled ? 'AI đang xử lý, vui lòng chờ' : 'Chụp ảnh uống nước'}
      >
        {!disabled && (
          <>
            <span className="main-action-pulse" aria-hidden="true" />
            <span className="main-action-pulse main-action-pulse--delay" aria-hidden="true" />
          </>
        )}
        <span className="main-action-icon"><img src="/camera.png" alt="icon" id='camera-icon'/></span>
      </button>
      <p className="main-action-label">
        {disabled ? 'AI ĐANG XỬ LÝ…' : 'CHỤP ẢNH UỐNG NƯỚC'}
      </p>
    </div>
  );
}
