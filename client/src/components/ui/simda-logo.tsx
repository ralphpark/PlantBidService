import React from 'react';

interface SimdaLogoProps {
  className?: string;
  color?: 'white' | 'green';
}

export function SimdaLogo({ className = '', color = 'white' }: SimdaLogoProps) {
  const textColor = color === 'white' ? 'white' : '#005E43';
  
  return (
    <div className={`font-serif ${className}`}>
      <span className={`text-${textColor} text-4xl`} style={{ color: textColor, fontWeight: 'bold' }}>
        simda
      </span>
    </div>
  );
}