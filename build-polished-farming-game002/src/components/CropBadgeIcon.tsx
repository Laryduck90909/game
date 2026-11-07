import React from 'react';
import { CropId } from '../types/game';

interface CropBadgeIconProps {
  cropId: CropId;
  className?: string;
}

export const CropBadgeIcon: React.FC<CropBadgeIconProps> = ({ cropId, className = 'w-7 h-7' }) => {
  switch (cropId) {
    case 'wheat':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M18 32V12" stroke="#7cb518" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="18" cy="10" rx="4" ry="7" fill="#ffbe0b" stroke="#9c5200" strokeWidth="1.6" />
          <ellipse
            cx="12.5"
            cy="15.5"
            rx="3.4"
            ry="5.5"
            transform="rotate(-24 12.5 15.5)"
            fill="#ffd166"
            stroke="#9c5200"
            strokeWidth="1.5"
          />
          <ellipse
            cx="23.5"
            cy="15.5"
            rx="3.4"
            ry="5.5"
            transform="rotate(24 23.5 15.5)"
            fill="#ffd166"
            stroke="#9c5200"
            strokeWidth="1.5"
          />
          <ellipse
            cx="13"
            cy="22"
            rx="3"
            ry="4.8"
            transform="rotate(-28 13 22)"
            fill="#f5b82e"
            stroke="#9c5200"
            strokeWidth="1.4"
          />
          <ellipse
            cx="23"
            cy="22"
            rx="3"
            ry="4.8"
            transform="rotate(28 23 22)"
            fill="#f5b82e"
            stroke="#9c5200"
            strokeWidth="1.4"
          />
        </svg>
      );

    case 'corn':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <ellipse cx="18" cy="17" rx="7" ry="12" fill="#ffd60a" stroke="#b5651d" strokeWidth="1.8" />
          <path d="M13 13H23M12.5 17.5H23.5M13.5 22H22.5M18 6V28" stroke="#e09f3e" strokeWidth="1.3" />
          <path
            d="M11 21C8 24 9 31 16 32C13 28 13 24 11 21Z"
            fill="#38b000"
            stroke="#1f6300"
            strokeWidth="1.5"
          />
          <path
            d="M25 21C28 24 27 31 20 32C23 28 23 24 25 21Z"
            fill="#55a630"
            stroke="#1f6300"
            strokeWidth="1.5"
          />
        </svg>
      );

    case 'strawberry':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M18 31C12 31 7.5 24 8.5 17C9.2 12.5 13 10.5 18 10.5C23 10.5 26.8 12.5 27.5 17C28.5 24 24 31 18 31Z"
            fill="#e63946"
            stroke="#8d0801"
            strokeWidth="1.8"
          />
          <path d="M12 11C14 8 22 8 24 11L18 13.5L12 11Z" fill="#55a630" stroke="#286310" strokeWidth="1.4" />
          <circle cx="14" cy="17" r="1.2" fill="#ffd166" />
          <circle cx="21" cy="17" r="1.2" fill="#ffd166" />
          <circle cx="17.5" cy="21.5" r="1.2" fill="#ffd166" />
          <circle cx="14.5" cy="25" r="1.2" fill="#ffd166" />
          <circle cx="21" cy="25" r="1.2" fill="#ffd166" />
        </svg>
      );

    case 'pumpkin':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M18 10C18 6.5 20.5 5 22.5 6" stroke="#4f772d" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="13" cy="20" rx="7.5" ry="10.5" fill="#e85d04" stroke="#9c3800" strokeWidth="1.7" />
          <ellipse cx="23" cy="20" rx="7.5" ry="10.5" fill="#e85d04" stroke="#9c3800" strokeWidth="1.7" />
          <ellipse cx="18" cy="20" rx="7" ry="11.2" fill="#f77f00" stroke="#9c3800" strokeWidth="1.7" />
        </svg>
      );
  }
};
