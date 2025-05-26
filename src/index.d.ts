import React from 'react';

interface SeaMotionProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
  intensity?: number;
  children?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

declare const SeaMotion: React.FC<SeaMotionProps>;

export default SeaMotion; 