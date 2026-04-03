import React, { useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface GlowWrapperProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  glowColor?: string;
  size?: number;
}

/**
 * GlowWrapper Component
 * 
 * Provides a subtle radial spotlight effect that follows the cursor
 * within the container. Uses CSS variables for high-performance tracking.
 */
export function GlowWrapper({ 
  children, 
  className, 
  contentClassName,
  glowColor = "rgba(37, 99, 235, 0.38)",
  size = 69
}: GlowWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    // Calculate mouse position relative to the container
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update CSS variables for the spotlight position
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden group transition-all duration-300",
        className
      )}
      style={{
        // Pass configuration via CSS variables
        '--spotlight-color': glowColor,
        '--spotlight-size': `${size}px`,
      } as React.CSSProperties}
    >
      {/* The Glow Effect Layer */}
      <div 
        className={cn(
          "pointer-events-none absolute -inset-px z-50 transition-opacity duration-300 ease-out",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(var(--spotlight-size) circle at var(--mouse-x) var(--mouse-y), rgba(37, 99, 235, 0.85) 0%, rgba(37, 99, 235, 0.5) 15%,rgba(37, 99, 235, 0.2) 30%, transparent 50%)`,
        }}
      />

      {/* Content Layer */}
      <div className={cn("relative z-10 w-full", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
