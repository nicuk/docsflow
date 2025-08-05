export default function DocumentFlowLogo({ 
  size = 80, 
  variant = "primary" 
}: { 
  size?: number;
  variant?: "primary" | "secondary";
}) {
  // Use the same blue-600 color as DOCS text
  const primaryColor = "#2563eb"; // blue-600
  const secondaryColor = "#3b82f6"; // blue-500
  const lightColor = "#60a5fa"; // blue-400
  
  if (variant === "secondary") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <defs>
          {/* Monochrome gradients for secondary variant */}
          <linearGradient id="monoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          <linearGradient id="monoLightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>

          <linearGradient id="monoWhiteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        
        {/* Background circle for depth */}
        <circle
          cx="40"
          cy="40"
          r="38"
          fill="url(#monoLightGradient)"
          opacity="0.08"
        />
        
        {/* Back document */}
        <g transform="translate(32, 24) rotate(-3)">
          <rect x="0" y="0" width="20" height="28" rx="2" fill="url(#monoGradient)" opacity="0.7" />
          <path d="M 15 0 L 20 0 L 20 5 Z" fill="url(#monoLightGradient)" opacity="0.6" />
          <path d="M 15 0 L 20 5 L 15 5 Z" fill="url(#monoGradient)" opacity="0.3" />
          <rect x="3" y="8" width="10" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" opacity="0.8" />
          <rect x="3" y="11" width="8" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" opacity="0.8" />
          <rect x="3" y="14" width="11" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" opacity="0.8" />
          <rect x="3" y="17" width="7" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" opacity="0.8" />
          <rect x="3" y="20" width="9" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" opacity="0.8" />
        </g>
        
        {/* Front document */}
        <g transform="translate(25, 26)">
          <rect x="0" y="0" width="22" height="28" rx="2" fill="#64748b" />
          <path d="M 16 0 L 22 0 L 22 6 Z" fill="url(#monoLightGradient)" opacity="0.8" />
          <path d="M 16 0 L 22 6 L 16 6 Z" fill="url(#monoGradient)" opacity="0.7" />
          <rect x="4" y="9" width="11" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" />
          <rect x="4" y="12" width="9" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" />
          <rect x="4" y="15" width="12" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" />
          <rect x="4" y="18" width="8" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" />
          <rect x="4" y="21" width="10" height="1.5" rx="0.5" fill="url(#monoWhiteGradient)" />
        </g>
        
        {/* Subtle indicators */}
        <circle cx="15" cy="35" r="1.5" fill="#64748b" opacity="0.4" />
        <circle cx="65" cy="40" r="1.5" fill="#64748b" opacity="0.4" />
        
        {/* Central processing symbol */}
        <g transform="translate(38, 58)">
          <circle cx="2" cy="2" r="2" fill="#64748b" opacity="0.3" />
          <circle cx="2" cy="2" r="1" fill="#94a3b8" opacity="0.4" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm"
    >
      <defs>
        {/* Primary gradient using blue-600 to match DOCS */}
        <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
        
        {/* Secondary gradient - lighter blues */}
        <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={secondaryColor} />
          <stop offset="100%" stopColor={lightColor} />
        </linearGradient>
        
        {/* Accent gradient - very light blue */}
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        
        {/* Flow gradient for subtle elements */}
        <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
          <stop offset="50%" stopColor={secondaryColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lightColor} stopOpacity="0.2" />
        </linearGradient>

        {/* White gradient for text lines */}
        <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      {/* Background circle for depth */}
      <circle
        cx="40"
        cy="40"
        r="38"
        fill="url(#accentGradient)"
        opacity="0.1"
      />
      
      {/* Back document - traditional document icon */}
      <g transform="translate(32, 24) rotate(-3)">
        {/* Document body */}
        <rect
          x="0"
          y="0"
          width="20"
          height="28"
          rx="2"
          fill="url(#secondaryGradient)"
          opacity="0.9"
        />
        {/* Folded corner */}
        <path
          d="M 15 0 L 20 0 L 20 5 Z"
          fill="url(#accentGradient)"
          opacity="0.7"
        />
        <path
          d="M 15 0 L 20 5 L 15 5 Z"
          fill={primaryColor}
          opacity="0.4"
        />
        {/* Text lines */}
        <rect x="3" y="8" width="10" height="1.5" rx="0.5" fill="url(#whiteGradient)" opacity="0.9" />
        <rect x="3" y="11" width="8" height="1.5" rx="0.5" fill="url(#whiteGradient)" opacity="0.9" />
        <rect x="3" y="14" width="11" height="1.5" rx="0.5" fill="url(#whiteGradient)" opacity="0.9" />
        <rect x="3" y="17" width="7" height="1.5" rx="0.5" fill="url(#whiteGradient)" opacity="0.9" />
        <rect x="3" y="20" width="9" height="1.5" rx="0.5" fill="url(#whiteGradient)" opacity="0.9" />
      </g>
      
      {/* Front document - traditional document icon */}
      <g transform="translate(25, 26)">
        {/* Document body */}
        <rect
          x="0"
          y="0"
          width="22"
          height="28"
          rx="2"
          fill={primaryColor}
        />
        {/* Folded corner */}
        <path
          d="M 16 0 L 22 0 L 22 6 Z"
          fill="url(#accentGradient)"
          opacity="0.9"
        />
        <path
          d="M 16 0 L 22 6 L 16 6 Z"
          fill="url(#secondaryGradient)"
          opacity="0.8"
        />
        {/* Text lines */}
        <rect x="4" y="9" width="11" height="1.5" rx="0.5" fill="url(#whiteGradient)" />
        <rect x="4" y="12" width="9" height="1.5" rx="0.5" fill="url(#whiteGradient)" />
        <rect x="4" y="15" width="12" height="1.5" rx="0.5" fill="url(#whiteGradient)" />
        <rect x="4" y="18" width="8" height="1.5" rx="0.5" fill="url(#whiteGradient)" />
        <rect x="4" y="21" width="10" height="1.5" rx="0.5" fill="url(#whiteGradient)" />
      </g>
      
      {/* Subtle flow indicators - curved lines only */}
      <path
        d="M 12 37 Q 17 32 22 37"
        stroke="url(#flowGradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      
      <path
        d="M 58 42 Q 63 37 68 42"
        stroke="url(#flowGradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      
      {/* Processing indicator dots */}
      <circle cx="15" cy="35" r="1.5" fill={primaryColor} opacity="0.5" />
      <circle cx="65" cy="40" r="1.5" fill={primaryColor} opacity="0.5" />
      
      {/* Central processing/AI symbol */}
      <g transform="translate(38, 58)">
        <circle
          cx="2"
          cy="2"
          r="2"
          fill={primaryColor}
          opacity="0.4"
        />
        <circle
          cx="2"
          cy="2"
          r="1"
          fill={secondaryColor}
          opacity="0.5"
        />
      </g>
    </svg>
  );
}
