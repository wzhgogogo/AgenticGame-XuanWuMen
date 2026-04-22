interface FlavorTextOverlayProps {
  text: string;
}

export default function FlavorTextOverlay({ text }: FlavorTextOverlayProps) {
  return (
    <div className="desk-flavor-overlay">
      <div className="desk-flavor-paper">
        <p className="font-game">{text}</p>
      </div>
    </div>
  );
}
