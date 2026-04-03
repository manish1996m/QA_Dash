import React, { useEffect, useState } from 'react';
import { cn } from '../utils/cn';

export function GlobalCursorGlow() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isActive) setIsActive(true);
    };

    const handleMouseLeave = () => {
      setIsActive(false);
    };

    const handleMouseEnter = () => {
      setIsActive(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isActive]);

  return (
    <div 
      className={cn(
        "pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300 ease-in-out",
        isActive ? "opacity-100" : "opacity-0"
      )}
      style={{
        background: `radial-gradient(35px circle at ${position.x}px ${position.y}px, rgba(37, 99, 235, 0.85) 0%, rgba(37, 99, 235, 0.5) 15%, rgba(37, 99, 235, 0.2) 30%, transparent 50%)`,
      }}
    />
  );
}
