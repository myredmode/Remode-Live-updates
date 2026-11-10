import React from 'react';

interface RedModeIconLogoProps {
  className?: string;
  size?: number | string;
  onClick?: () => void;
}

/**
 * Exact vector recreation of REDMODE's official red wing/wave icon logo
 * Preserves the exact curves, dual-tone layered shading, and transparent background
 * from Made_on_Loom-removebg-preview.png.
 */
export const RedModeIconLogo: React.FC<RedModeIconLogoProps> = ({
  className = '',
  size = 56,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`inline-block select-none transition-transform duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      style={{ width: typeof size === 'number' ? `${size * 1.78}px` : size, height: typeof size === 'number' ? `${size}px` : 'auto' }}
      title="REDMODE"
      aria-label="REDMODE Logo Icon"
    >
      <svg
        viewBox="24 24 246 138"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain overflow-visible"
      >
        <defs>
          {/* Top Wing Gradient: Rich vibrant scarlet to deep carmine */}
          <linearGradient id="redmode-top-wing" x1="20" y1="40" x2="260" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DE1B24" />
            <stop offset="35%" stopColor="#E5232A" />
            <stop offset="70%" stopColor="#DE1B24" />
            <stop offset="100%" stopColor="#CB121B" />
          </linearGradient>

          {/* Bottom Tail Gradient: Deep burgundy red for depth and 3D layering */}
          <linearGradient id="redmode-bottom-tail" x1="30" y1="90" x2="240" y2="155" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4131C" />
            <stop offset="45%" stopColor="#B30E16" />
            <stop offset="100%" stopColor="#8F0910" />
          </linearGradient>

          {/* Crease / Inner Fold Shadow Gradient */}
          <linearGradient id="redmode-fold-shadow" x1="50" y1="80" x2="160" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A80B13" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7E060D" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 1. Bottom / Under Wing Shape (Sweeps down and up to pointed tail tip) */}
        <path
          d="M 28 88
             C 45 106, 75 148, 126 156
             C 162 161, 204 153, 238 128
             C 214 135, 178 132, 148 116
             C 122 102, 94 88, 64 85
             C 50 83, 37 85, 28 88 Z"
          fill="url(#redmode-bottom-tail)"
        />

        {/* 2. Middle Layer Inner Fold Shadow */}
        <path
          d="M 28 88
             C 45 98, 70 106, 102 105
             C 130 104, 155 96, 178 86
             C 152 92, 122 93, 92 88
             C 65 84, 45 84, 28 88 Z"
          fill="url(#redmode-fold-shadow)"
        />

        {/* 3. Top / Upper Wing Shape (Graceful wave crest flipping up at the far right wingtip) */}
        <path
          d="M 28 88
             C 38 68, 62 40, 104 36
             C 144 32, 185 58, 222 55
             C 244 53, 258 41, 266 28
             C 264 42, 255 58, 240 71
             C 215 90, 175 92, 142 84
             C 106 75, 68 76, 28 88 Z"
          fill="url(#redmode-top-wing)"
        />
      </svg>
    </div>
  );
};
