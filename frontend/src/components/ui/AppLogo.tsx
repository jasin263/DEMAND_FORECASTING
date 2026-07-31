import React from 'react';

interface AppLogoProps {
  size?: number;
}

export default function AppLogo({ size = 28 }: AppLogoProps) {
  return (
    <div
      className="gradient-primary rounded-lg flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>
        FQ
      </span>
    </div>
  );
}
