export default function Logo({ size = "md", className = "" }) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <svg viewBox="0 0 200 160" className={`${sizeMap[size]} ${className}`} fill="none">
      {/* Película enrollada (izquierda) */}
      {/* Espira superior */}
      <path d="M 30 50 Q 50 30 70 40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      {/* Espira media superior */}
      <path d="M 25 70 Q 50 60 75 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      {/* Espira media */}
      <path d="M 30 90 Q 55 85 80 95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      {/* Espira inferior */}
      <path d="M 35 110 Q 60 110 85 115" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      
      {/* Película central (rectángulo con líneas de fotogramas) */}
      <rect x="60" y="55" width="50" height="65" rx="4" stroke="currentColor" strokeWidth="3" />
      <line x1="60" y1="65" x2="110" y2="65" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="75" x2="110" y2="75" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="85" x2="110" y2="85" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="95" x2="110" y2="95" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="105" x2="110" y2="105" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="115" x2="110" y2="115" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      
      {/* Película enrollada (derecha) */}
      {/* Espira superior */}
      <path d="M 170 50 Q 150 30 130 40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      {/* Espira media superior */}
      <path d="M 175 70 Q 150 60 125 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      {/* Espira media */}
      <path d="M 170 90 Q 145 85 120 95" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      {/* Espira inferior */}
      <path d="M 165 110 Q 140 110 115 115" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      
      {/* Claqueta de cine (derecha abajo) */}
      <rect x="120" y="95" width="65" height="55" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" opacity="0.1" />
      
      {/* Barras de la claqueta (negras y rojas alternadas) */}
      <rect x="122" y="97" width="8" height="20" fill="currentColor" />
      <rect x="132" y="97" width="8" height="20" fill="currentColor" opacity="0.5" />
      <rect x="142" y="97" width="8" height="20" fill="currentColor" />
      <rect x="152" y="97" width="8" height="20" fill="currentColor" opacity="0.5" />
      <rect x="162" y="97" width="8" height="20" fill="currentColor" />
      
      {/* Líneas de la claqueta */}
      <line x1="122" y1="125" x2="180" y2="125" stroke="currentColor" strokeWidth="2" />
      <line x1="122" y1="135" x2="180" y2="135" stroke="currentColor" strokeWidth="2" />
      <line x1="122" y1="145" x2="180" y2="145" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
