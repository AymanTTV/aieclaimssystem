// src/components/finance/UKBankIcons.tsx
import React from 'react';

interface BankIconProps {
  className?: string;
  size?: number;
}

export const BarclaysLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#00395D" />
    <path
      d="M24 10C16.268 10 10 16.268 10 24C10 31.732 16.268 38 24 38C31.732 38 38 31.732 38 24C38 16.268 31.732 10 24 10ZM24 14C27.314 14 30.25 15.686 32 18.286L26.5 24L32 29.714C30.25 32.314 27.314 34 24 34C18.477 34 14 29.523 14 24C14 18.477 18.477 14 24 14Z"
      fill="#00AEEF"
    />
    <path
      d="M22 17L28 24L22 31H18L24 24L18 17H22Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const LloydsLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#006A4E" />
    {/* Stylized iconic black horse silhouette in white */}
    <path
      d="M17 34C17 34 16 30 18 26C19 24 21 23 21 21C21 19 20 18 19 16C18 14 19 12 22 12C25 12 27 14 27 16C27 17 28 18 30 18C32 18 34 19 34 22C34 25 31 27 29 27C27 27 26 29 26 31C26 33 26 34 26 34H17Z"
      fill="#FFFFFF"
    />
    <circle cx="23" cy="15" r="1.5" fill="#006A4E" />
    <path
      d="M27 34V29C29 29 32 27 33 24"
      stroke="#A3E635"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const NatWestLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#4A154B" />
    {/* NatWest Triple Arrow Triangular Chevrons */}
    <path
      d="M24 12L34 18V30L24 36L14 30V18L24 12Z"
      stroke="#FF1A4B"
      strokeWidth="2.5"
    />
    <path
      d="M24 17L30 20.5V27.5L24 31L18 27.5V20.5L24 17Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const HSBCLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
    {/* HSBC Red Hexagram / Triangles */}
    <rect x="18" y="18" width="12" height="12" fill="#DB0011" />
    <polygon points="12,24 18,18 18,30" fill="#DB0011" />
    <polygon points="36,24 30,18 30,30" fill="#DB0011" />
    <polygon points="24,12 18,18 30,18" fill="#DB0011" />
    <polygon points="24,36 18,30 30,30" fill="#DB0011" />
  </svg>
);

export const SantanderLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#EC0000" />
    {/* Santander Flame Icon */}
    <path
      d="M24 12C24 12 18 18 18 25C18 28.5 20.5 32 24 32C27.5 32 30 28.5 30 25C30 18 24 12 24 12Z"
      fill="#FFFFFF"
    />
    <path
      d="M21 26C21 24.5 22.5 22 24 20C25.5 22 27 24.5 27 26C27 28 25.5 29.5 24 29.5C22.5 29.5 21 28 21 26Z"
      fill="#EC0000"
    />
  </svg>
);

export const HalifaxLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#00488F" />
    {/* Halifax Iconic 'X' in blue & white */}
    <path
      d="M14 14L34 34M34 14L14 34"
      stroke="#FFFFFF"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M17 17L31 31"
      stroke="#00AEEF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const MonzoLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#14233C" />
    {/* Monzo Iconic 'M' Colorful Pillars */}
    <rect x="13" y="18" width="4" height="15" rx="2" fill="#FF3B30" />
    <path d="M19 22L24 27L29 22" stroke="#FFCC00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="31" y="18" width="4" height="15" rx="2" fill="#00C48C" />
  </svg>
);

export const StarlingLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#253B80" />
    {/* Starling dual-color ring */}
    <circle cx="24" cy="24" r="12" stroke="#6935D3" strokeWidth="5" />
    <path
      d="M24 12C30.6274 12 36 17.3726 36 24"
      stroke="#25C9D0"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
);

export const RevolutLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#191C1F" />
    {/* Revolut Stylized 'R' */}
    <path
      d="M17 14H26C29.3137 14 32 16.6863 32 20C32 23.3137 29.3137 26 26 26H22V34H17V14Z"
      fill="#FFFFFF"
    />
    <path
      d="M23 24L31 34H25L19 26"
      fill="#0075FF"
    />
  </svg>
);

export const NationwideLogo: React.FC<BankIconProps> = ({ className = 'w-8 h-8', size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="48" height="48" rx="10" fill="#00174F" />
    {/* Nationwide iconic red house with sun */}
    <circle cx="28" cy="18" r="4.5" fill="#D4143D" />
    <path
      d="M16 23L24 17L32 23V31H16V23Z"
      fill="#FFFFFF"
    />
    <path
      d="M22 31V25H26V31H22Z"
      fill="#00174F"
    />
  </svg>
);

export const BankAppIcon: React.FC<{ bankId: string; className?: string; size?: number }> = ({
  bankId,
  className = 'w-8 h-8',
  size = 32,
}) => {
  switch (bankId) {
    case 'barclays':
      return <BarclaysLogo className={className} size={size} />;
    case 'lloyds':
      return <LloydsLogo className={className} size={size} />;
    case 'natwest':
      return <NatWestLogo className={className} size={size} />;
    case 'hsbc':
      return <HSBCLogo className={className} size={size} />;
    case 'santander':
      return <SantanderLogo className={className} size={size} />;
    case 'halifax':
      return <HalifaxLogo className={className} size={size} />;
    case 'monzo':
      return <MonzoLogo className={className} size={size} />;
    case 'starling':
      return <StarlingLogo className={className} size={size} />;
    case 'revolut':
      return <RevolutLogo className={className} size={size} />;
    case 'nationwide':
      return <NationwideLogo className={className} size={size} />;
    default:
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs ${className}`}
        >
          UK
        </div>
      );
  }
};
