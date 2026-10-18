import React from 'react';

export const BrandLogo = ({ size = 28, className = '', style = {} }) => (
  <img
    src="/logo.png"
    alt="HireMySkills Logo"
    width={size}
    height={size}
    className={`brand-logo-img ${className}`.trim()}
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
      ...style,
    }}
  />
);

export default BrandLogo;
