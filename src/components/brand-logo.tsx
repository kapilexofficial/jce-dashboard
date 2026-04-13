interface Props {
  brand: string;
  size?: number;
}

export function BrandLogo({ brand, size = 40 }: Props) {
  const s = size;
  const half = s / 2;

  switch (brand.toUpperCase()) {
    case "VOLVO":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="45" stroke="#4A90D9" strokeWidth="4" />
          <line x1="5" y1="50" x2="95" y2="50" stroke="#4A90D9" strokeWidth="4" />
          <path d="M50 5 L63 50 L50 95" stroke="#4A90D9" strokeWidth="4" fill="none" />
          <text x="50" y="40" textAnchor="middle" fontSize="14" fontWeight="900" fill="#4A90D9" fontFamily="Arial">VOLVO</text>
          <text x="50" y="65" textAnchor="middle" fontSize="8" fill="#4A90D9" fontFamily="Arial">TRUCKS</text>
        </svg>
      );

    case "DAF":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <rect x="5" y="25" width="90" height="50" rx="8" fill="#004B93" />
          <text x="50" y="58" textAnchor="middle" fontSize="28" fontWeight="900" fill="white" fontFamily="Arial">DAF</text>
        </svg>
      );

    case "MAN":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <rect x="5" y="20" width="90" height="60" rx="8" fill="#1D1D1B" />
          <text x="50" y="60" textAnchor="middle" fontSize="30" fontWeight="900" fill="#E0E0E0" fontFamily="Arial">MAN</text>
        </svg>
      );

    case "M.BENZ":
    case "MERCEDES BENZ":
    case "MERCEDES-BENZ":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="#C0C0C0" strokeWidth="3" />
          <circle cx="50" cy="50" r="35" stroke="#C0C0C0" strokeWidth="2" />
          {/* Three-pointed star */}
          <line x1="50" y1="15" x2="50" y2="50" stroke="#C0C0C0" strokeWidth="3" />
          <line x1="50" y1="50" x2="20" y2="72" stroke="#C0C0C0" strokeWidth="3" />
          <line x1="50" y1="50" x2="80" y2="72" stroke="#C0C0C0" strokeWidth="3" />
        </svg>
      );

    case "SCANIA":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" fill="#C8102E" />
          <text x="50" y="42" textAnchor="middle" fontSize="11" fontWeight="900" fill="white" fontFamily="Arial">SCANIA</text>
          <path d="M30 55 Q40 65 50 55 Q60 45 70 55" stroke="white" strokeWidth="2.5" fill="none" />
          <circle cx="50" cy="50" r="38" stroke="white" strokeWidth="1.5" fill="none" />
        </svg>
      );

    case "VOLKSWAGEN":
    case "VW":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="42" stroke="#001E50" strokeWidth="4" />
          <text x="50" y="42" textAnchor="middle" fontSize="26" fontWeight="900" fill="#001E50" fontFamily="Arial">V</text>
          <text x="50" y="68" textAnchor="middle" fontSize="26" fontWeight="900" fill="#001E50" fontFamily="Arial">W</text>
        </svg>
      );

    case "IVECO":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <rect x="5" y="25" width="90" height="50" rx="8" fill="#003366" />
          <text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="900" fill="white" fontFamily="Arial">IVECO</text>
        </svg>
      );

    case "FACCHINI":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <rect x="5" y="30" width="90" height="40" rx="6" fill="#2E5090" />
          <text x="50" y="56" textAnchor="middle" fontSize="14" fontWeight="800" fill="white" fontFamily="Arial">FACCHINI</text>
        </svg>
      );

    case "RANDON":
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <rect x="5" y="30" width="90" height="40" rx="6" fill="#E31937" />
          <text x="50" y="56" textAnchor="middle" fontSize="15" fontWeight="800" fill="white" fontFamily="Arial">RANDON</text>
        </svg>
      );

    default:
      return (
        <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="40" fill="#333" />
          <text x="50" y="55" textAnchor="middle" fontSize="14" fontWeight="700" fill="#999" fontFamily="Arial">
            {brand.slice(0, 3)}
          </text>
        </svg>
      );
  }
}
