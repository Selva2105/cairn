import React from 'react';

export interface CairnMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const CairnMark: React.FC<CairnMarkProps> = ({
  size = 128,
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      {/* Background squircle filled via theme token */}
      <rect width="128" height="128" rx="28" fill="var(--bg-surface)" />

      {/* Base Stone */}
      <path
        d="M 28 88 C 28 81, 38 78, 64 78 C 90 78, 100 81, 100 88 C 100 95, 90 98, 64 98 C 38 98, 28 95, 28 88 Z"
        fill="var(--icon-stone-base)"
      />

      {/* Middle Stone */}
      <path
        d="M 34 60 C 34 53, 44 50, 64 50 C 84 50, 94 53, 94 60 C 94 67, 84 70, 64 70 C 44 70, 34 67, 34 60 Z"
        fill="var(--icon-stone-base)"
      />

      {/* Top Roof Stone (Gable Beacon) */}
      <path
        d="M 64 20 L 86 36 C 88 38, 86 42, 80 43 C 70 44, 58 44, 48 43 C 42 42, 40 38, 42 36 Z"
        fill="var(--icon-stone-accent)"
      />
    </svg>
  );
};
