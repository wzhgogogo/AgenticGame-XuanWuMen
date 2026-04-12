interface NarratorPanelProps {
  time: string;
  location: string;
}

export default function NarratorPanel({ time, location }: NarratorPanelProps) {
  return (
    <div
      className="px-4 py-3 text-center font-game"
      style={{
        backgroundColor: '#0e0e16',
        borderBottom: '1px solid #1a1a24',
      }}
    >
      <span className="text-sm" style={{ color: '#8a8070' }}>
        {time} · {location}
      </span>
    </div>
  );
}
