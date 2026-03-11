interface OriginMarkProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function OriginMark({ width = 64, height = 64, className }: OriginMarkProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Vertical crosshair */}
      <line x1="32" y1="4" x2="32" y2="25" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="32" y1="39" x2="32" y2="60" stroke="#F59E0B" strokeWidth="1.5" />
      {/* Horizontal crosshair */}
      <line x1="4" y1="32" x2="25" y2="32" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="39" y1="32" x2="60" y2="32" stroke="#F59E0B" strokeWidth="1.5" />
      {/* Center square */}
      <rect x="28" y="28" width="8" height="8" fill="#F59E0B" />
    </svg>
  );
}
