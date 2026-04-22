import type { ReactNode } from 'react';
import ChangAnMap from './ChangAnMap';

interface ImperialDeskProps {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  onClickBackground: () => void;
  children: ReactNode;
}

export default function ImperialDesk({ timeSlot, onClickBackground, children }: ImperialDeskProps) {
  return (
    <div
      className={`imperial-desk imperial-desk--${timeSlot}`}
      onClick={onClickBackground}
    >
      <ChangAnMap />
      <div className="imperial-desk-light" />
      {children}
    </div>
  );
}
