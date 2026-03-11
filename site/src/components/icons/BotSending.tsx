interface BotSendingProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function BotSending({ width = 40, height = 47, className }: BotSendingProps) {
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
      {/* Indicator light on body */}
      <rect x="34" y="32" width="4" height="4" fill="#F59E0B" />
      {/* Signal lines going up-right from body */}
      <line x1="36" y1="30" x2="42" y2="24" stroke="#F59E0B" strokeWidth="1" opacity="0.5" />
      <line x1="36" y1="28" x2="44" y2="20" stroke="#F59E0B" strokeWidth="1" opacity="0.3" />
      {/* Neck */}
      <line x1="20" y1="28" x2="20" y2="22" stroke="#E8E8E8" strokeWidth="1.5" />
      <line x1="28" y1="28" x2="28" y2="22" stroke="#E8E8E8" strokeWidth="1.5" />
      {/* Head */}
      <rect x="14" y="14" width="20" height="9" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      {/* Left eye */}
      <line x1="19" y1="14" x2="18" y2="9" stroke="#E8E8E8" strokeWidth="1.5" />
      <rect x="13" y="3" width="8" height="7" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      <rect x="15" y="4" width="4" height="3" fill="#F59E0B" />
      {/* Right eye */}
      <line x1="29" y1="14" x2="30" y2="9" stroke="#E8E8E8" strokeWidth="1.5" />
      <rect x="27" y="3" width="8" height="7" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
      <rect x="29" y="4" width="4" height="3" fill="#F59E0B" />
    </svg>
  );
}
