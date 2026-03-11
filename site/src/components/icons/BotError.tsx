interface BotErrorProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function BotError({ width = 40, height = 47, className }: BotErrorProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Treads */}
      <rect x="6" y="46" width="12" height="6" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      <rect x="30" y="46" width="12" height="6" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Body */}
      <rect x="8" y="28" width="32" height="18" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Neck */}
      <line x1="20" y1="28" x2="20" y2="22" stroke="#E8E8E8" strokeWidth="1.5" />
      <line x1="28" y1="28" x2="28" y2="22" stroke="#E8E8E8" strokeWidth="1.5" />
      {/* Head */}
      <rect x="14" y="14" width="20" height="9" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Left eye - dimmed housing */}
      <line x1="19" y1="14" x2="18" y2="9" stroke="#E8E8E8" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="7" stroke="#4A4A4A" strokeWidth="1.5" fill="none" />
      {/* Left eye X */}
      <line x1="14.5" y1="4.5" x2="19.5" y2="8.5" stroke="#EF4444" strokeWidth="1.5" />
      <line x1="19.5" y1="4.5" x2="14.5" y2="8.5" stroke="#EF4444" strokeWidth="1.5" />
      {/* Right eye - dimmed housing */}
      <line x1="29" y1="14" x2="30" y2="9" stroke="#E8E8E8" strokeWidth="1.5" />
      <rect x="27" y="3" width="8" height="7" stroke="#4A4A4A" strokeWidth="1.5" fill="none" />
      {/* Right eye X */}
      <line x1="28.5" y1="4.5" x2="33.5" y2="8.5" stroke="#EF4444" strokeWidth="1.5" />
      <line x1="33.5" y1="4.5" x2="28.5" y2="8.5" stroke="#EF4444" strokeWidth="1.5" />
    </svg>
  );
}
