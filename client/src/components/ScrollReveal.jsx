import React from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

/**
 * Reusable ScrollReveal wrapper component.
 *
 * Usage:
 * <ScrollReveal animation="fade-up" delay={100} className="my-card">
 *   <CardContent />
 * </ScrollReveal>
 */
const ScrollReveal = ({
  as: Component = 'div',
  animation = 'fade-up', // 'fade-up' | 'fade-in' | 'scale-in'
  delay = 0,
  threshold = 0.12,
  className = '',
  style = {},
  children,
  ...props
}) => {
  const [ref, isRevealed] = useScrollReveal({ threshold });

  const getAnimationClass = () => {
    switch (animation) {
      case 'fade-in':
        return 'reveal-fade-in';
      case 'scale-in':
        return 'reveal-scale-in';
      case 'fade-up':
      default:
        return 'reveal-on-scroll';
    }
  };

  const combinedStyle = {
    ...style,
    ...(delay ? { transitionDelay: `${delay}ms` } : {}),
  };

  return (
    <Component
      ref={ref}
      className={`${getAnimationClass()} ${isRevealed ? 'is-revealed' : ''} ${className}`.trim()}
      style={combinedStyle}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;
