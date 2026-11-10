import React from 'react';

interface RedModeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  theme?: 'light' | 'dark';
  className?: string;
  onClick?: () => void;
}

export const RedModeLogo: React.FC<RedModeLogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  onClick,
}) => {
  // Mobile-first responsive sizing & kerning
  const sizeClasses = {
    sm: 'text-base sm:text-lg tracking-[0.14em] sm:tracking-[0.18em]',
    md: 'text-lg sm:text-xl md:text-2xl tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.22em]',
    lg: 'text-2xl sm:text-3xl md:text-4xl tracking-[0.18em] sm:tracking-[0.22em]',
    xl: 'text-3xl sm:text-4xl md:text-5xl tracking-[0.2em] sm:tracking-[0.25em]',
    custom: '',
  };

  const modeColor = theme === 'dark' ? 'text-white' : 'text-[#121212]';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <span
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`inline-flex items-center justify-center font-sans uppercase select-none whitespace-nowrap leading-none transition duration-150 cursor-pointer hover:opacity-90 active:scale-[0.98] ${sizeClasses[size]} ${className}`}
      aria-label="REDMODE"
    >
      <span className="font-black text-[#E52229] tracking-tight">RED</span>
      <span className={`font-extrabold ${modeColor} tracking-tight ml-0.5`}>MODE</span>
    </span>
  );
};
