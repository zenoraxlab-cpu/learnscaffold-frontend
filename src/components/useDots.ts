'use client';

import { useEffect, useState } from 'react';

export function useDots() {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : '.'));
    }, 350);

    return () => clearInterval(timer);
  }, []);

  return dots;
}
