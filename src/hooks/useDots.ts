import { useState, useEffect } from 'react';

export function useDots() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) =>
        d.length >= 3 ? '' : d + '.'
      );
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return dots;
}
