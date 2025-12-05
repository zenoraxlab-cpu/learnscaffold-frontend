'use client';
import { useState, useEffect } from 'react';

/**
 * Animated dots for loading indicators ("Analyzing.", "Analyzing..", "Analyzing...")
 * This hook cycles dots from '' → '.' → '..' → '...' → '' ...
 */
export const useDots = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return dots;
};
