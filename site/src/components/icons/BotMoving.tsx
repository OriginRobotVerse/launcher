interface BotMovingProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function BotMoving({ width = 40, height = 47, className }: BotMovingProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Motion lines */}
      <line x1="2" y1="36" x2="6" y2="36" stroke="#4A4A4A" strokeWidth="1" />
      <line x1="0" y1="40" x2="6" y2="40" stroke="#4A4A4A" strokeWidth="1" />
      <line x1="2" y1="44" x2="6" y2="44" stroke="#4A4A4A" strokeWidth="1" />
      {/* Treads (shifted +2px right) */}
      <rect x="8" y="46" width="12" height="6" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      <rect x="32" y="46" width="12" height="6" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Body (shifted +2px right) */}
      <rect x="10" y="28" width="32" height="18" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Neck (shifted +2px right) */}
      <line x1="22" y1="28" x2="22" y2="22" stroke="#E8E8E8" strokeWidth="1.5" />
      <line x1="30" y1="28" x2="30" y2="22" stroke="#E8E8E8" strokeWidth="1.5" />
      {/* Head (shifted +2px right) */}
      <rect x="16" y="14" width="20" height="9" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Left eye (shifted +2px right) */}
      <line x1="21" y1="14" x2="20" y2="9" stroke="#E8E8E8" strokeWidth="1.5" />
      <rect x="15" y="3" width="8" height="7" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      <rect x="17" y="4" width="4" height="3" fill="#F59E0B" />
      {/* Right eye (shifted +2px right) */}
      <line x1="31" y1="14" x2="32" y2="9" stroke="#E8E8E8" strokeWidth="1.5" />
      <rect x="29" y="3" width="8" height="7" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      <rect x="31" y="4" width="4" height="3" fill="#F59E0B" />
    </svg>
  );
}
