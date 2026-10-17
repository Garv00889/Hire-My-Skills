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

    const revealElements = () => {
      const targets = document.querySelectorAll(
        '.reveal-on-scroll:not(.is-revealed), .reveal-fade-in:not(.is-revealed), .reveal-scale-in:not(.is-revealed)'
      );

      if (targets.length === 0) return;

      if (!('IntersectionObserver' in window) || reducedMotion) {
        targets.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
      );

      targets.forEach((target) => observer.observe(target));

      return observer;
    };

    const initialObserver = revealElements();

    // Observe dynamic DOM injections (e.g. async project lists, lazy-loaded components)
    let mutationObserver = null;
    if ('MutationObserver' in window) {
      mutationObserver = new MutationObserver(() => {
        revealElements();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      if (initialObserver) initialObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, []);
};

export default useScrollReveal;
