import type { ReactNode } from 'react';

interface ImperialDeskProps {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  onClickBackground: () => void;
  children: ReactNode;
}

export default function ImperialDesk({ onClickBackground, children }: ImperialDeskProps) {
  return (
    <div
      className="imperial-desk"
      onClick={onClickBackground}
      style={{ position: 'relative', width: '75%', height: '65%' }}
    >
      {children}
    </div>
  );
}
