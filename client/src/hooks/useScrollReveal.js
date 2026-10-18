import { useEffect, useRef, useState } from 'react';

/**
 * Hook to observe a single element and trigger animation when it enters the viewport.
 * Unobserves immediately after revealing to minimize CPU & memory impact.
 */
export const useScrollReveal = (options = {}) => {
  const {
    threshold = 0.12,
    rootMargin = '0px 0px -40px 0px',
    triggerOnce = true,
  } = options;

  const elementRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Gracefully handle reduced motion or missing IntersectionObserver
    if (
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsRevealed(true);
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!triggerOnce) {
            setIsRevealed(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [elementRef, isRevealed];
};

/**
 * Global hook to automatically attach an IntersectionObserver to any
 * DOM element with .reveal-on-scroll, .reveal-fade-in, or .reveal-scale-in.
 */
export const useGlobalScrollReveal = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('IntersectionObserver' in window) || reducedMotion) {
      document.querySelectorAll('.reveal-on-scroll, .reveal-fade-in, .reveal-scale-in')
        .forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    // Single persistent observer instance for all scroll-reveal elements
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px 80px 0px' }
    );

    const observeNewElements = () => {
      const targets = document.querySelectorAll(
        '.reveal-on-scroll:not(.is-revealed):not([data-observed]), .reveal-fade-in:not(.is-revealed):not([data-observed]), .reveal-scale-in:not(.is-revealed):not([data-observed])'
      );
      targets.forEach((target) => {
        target.setAttribute('data-observed', '1');
        observer.observe(target);
      });
    };

    observeNewElements();

    // Safety fallback: ensure any element not yet revealed becomes visible after 1s
    const safetyTimer = setTimeout(() => {
      document.querySelectorAll(
        '.reveal-on-scroll:not(.is-revealed), .reveal-fade-in:not(.is-revealed), .reveal-scale-in:not(.is-revealed)'
      ).forEach((el) => {
        el.classList.add('is-revealed');
      });
    }, 1000);

    // Debounce mutation monitoring with requestAnimationFrame to prevent DOM thrashing
    let rafId = null;
    let mutationObserver = null;
    if ('MutationObserver' in window) {
      mutationObserver = new MutationObserver(() => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(observeNewElements);
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      clearTimeout(safetyTimer);
      if (mutationObserver) mutationObserver.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
};

export default useScrollReveal;
