import React from 'react';

interface SeaMotionProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
  intensity?: number;
  duration?: number; // Duration in seconds, infinite if undefined
  children?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onAnimationEnd?: () => void; // Callback when animation stops due to duration timeout
}

declare const SeaMotion: React.FC<SeaMotionProps>;

export default SeaMotion; 