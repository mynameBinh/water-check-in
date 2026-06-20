import './HeaderComponent.css';

const R = 72;
const SW = 12;
const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;

function GlassIcon({ filled }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden="true">
      <path
        d="M2.5 1.5h13l-2 18h-9l-2-18z"
        fill={filled ? 'rgba(56,189,248,0.25)' : 'transparent'}
        stroke={filled ? '#38BDF8' : '#BAE6FD'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {filled && (
        <path d="M4.5 11 Q9 8.5 13.5 11" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" />
      )}
    </svg>
  );
}

function CircularProgress({ percentage, currentWater, goalMl }) {
  const offset = CIRC - (percentage / 100) * CIRC;
  const filledGlasses = Math.floor(currentWater / 250);
  const totalGlasses  = Math.ceil(goalMl / 250);

  return (
    <div className="progress-wrapper">
      <svg
        width={SIZE} height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="progress-svg"
        aria-label={`${percentage}% mục tiêu uống nước`}
      >
        <defs>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#4DD0E1" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#DCF0FB"
          strokeWidth={SW}
        />

        {/* Progress arc */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="url(#waterGrad)"
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CY})`}
          filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }}
        />

        {/* Percentage text */}
        <text
          x={CX} y={CY - 14}
          textAnchor="middle"
          fill="#0C2340"
          fontSize="34"
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          {percentage}%
        </text>

        {/* Current ml */}
        <text
          x={CX} y={CY + 14}
          textAnchor="middle"
          fill="#38BDF8"
          fontSize="17"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {currentWater}ml
        </text>

        {/* Goal label */}
        <text
          x={CX} y={CY + 34}
          textAnchor="middle"
          fill="#94B4C5"
          fontSize="12"
          fontFamily="Inter, sans-serif"
        >
          / {goalMl}ml
        </text>
      </svg>

      <div className="glass-row" aria-label="Các cốc nước">
        {Array.from({ length: totalGlasses }, (_, i) => (
          <GlassIcon key={i} filled={i < filledGlasses} />
        ))}
      </div>
    </div>
  );
}

export default function HeaderComponent({ currentWater, goalMl }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const percentage = Math.min(100, Math.round((currentWater / goalMl) * 100));

  return (
    <header className="header-card">
      <div className="header-top-row">
        <div>
          <p className="greeting">Chào sếp Nguyễn! 👋</p>
          <p className="header-date">{dateStr}</p>
        </div>
        <div className="header-drop" aria-hidden="true">💧</div>
      </div>

      <CircularProgress
        percentage={percentage}
        currentWater={currentWater}
        goalMl={goalMl}
      />

      {currentWater >= goalMl && (
        <p className="goal-reached">🎉 Đạt mục tiêu hôm nay!</p>
      )}
    </header>
  );
}
