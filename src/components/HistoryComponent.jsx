import './HistoryComponent.css';

function GlassIcon() {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
      <path
        d="M3 1.5h14l-2 20H5l-2-20z"
        fill="rgba(56,189,248,0.18)"
        stroke="#38BDF8"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 11 Q10 8 15 11"
        stroke="rgba(56,189,248,0.5)"
        strokeWidth="1.1"
        fill="none"
      />
    </svg>
  );
}

export default function HistoryComponent({ history }) {
  return (
    <section className="history-card">
      <div className="history-head">
        <h2 className="history-title">HÔM NAY</h2>
        {history.length > 0 && (
          <span className="history-count">{history.length} lần</span>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <p>💧 Chưa có lần uống nào</p>
          <p className="history-empty-sub">Nhấn nút camera để ghi nhận!</p>
        </div>
      ) : (
        <ul className="history-list">
          {history.map((item, idx) => (
            <li key={item.id} className="history-item">
              <div className="history-item-icon">
                <GlassIcon />
              </div>
              <div className="history-item-info">
                <span className="history-item-time">{item.time}</span>
              </div>
              <div className="history-item-right">
                <span className="history-item-vol">+{item.volume}ml</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
