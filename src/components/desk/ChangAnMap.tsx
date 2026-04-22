export default function ChangAnMap() {
  return (
    <div className="changan-map">
      <svg
        viewBox="0 0 400 300"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* 桌面使用痕迹——墨痕、磨损 */}
        <circle cx="180" cy="130" r="25" fill="rgba(40,30,15,0.04)" />
        <circle cx="320" cy="80" r="12" fill="rgba(40,30,15,0.03)" />
        <ellipse cx="100" cy="220" rx="30" ry="8" fill="rgba(40,30,15,0.03)" transform="rotate(-12 100 220)" />

        {/* 极淡地图痕迹——像桌上留下的旧墨印 */}
        {/* 城廓轮廓 */}
        <rect
          x="120" y="40" width="160" height="220" rx="2"
          fill="none" stroke="rgba(80,60,30,0.08)" strokeWidth="0.8"
        />

        {/* 中轴 */}
        <line x1="200" y1="45" x2="200" y2="255" stroke="rgba(80,60,30,0.06)" strokeWidth="0.8" />

        {/* 太极宫——极淡矩形 */}
        <rect
          x="160" y="48" width="80" height="35" rx="1"
          fill="rgba(80,60,30,0.04)" stroke="rgba(80,60,30,0.1)" strokeWidth="0.6"
        />
        <text
          x="200" y="70" textAnchor="middle"
          className="changan-map-label"
        >
          太极宫
        </text>

        {/* 玄武门——微微金色 */}
        <rect
          x="182" y="40" width="36" height="9" rx="1"
          fill="rgba(140,100,40,0.06)" stroke="rgba(140,100,40,0.15)" strokeWidth="0.6"
        />
        <text
          x="200" y="36" textAnchor="middle"
          className="changan-map-label changan-map-label--highlight"
        >
          玄武门
        </text>

        {/* 秦王府 */}
        <rect
          x="140" y="190" width="45" height="28" rx="1"
          fill="rgba(80,60,30,0.03)" stroke="rgba(80,60,30,0.08)" strokeWidth="0.6"
        />
        <text
          x="162" y="208" textAnchor="middle"
          className="changan-map-label"
        >
          秦王府
        </text>
      </svg>
    </div>
  );
}
