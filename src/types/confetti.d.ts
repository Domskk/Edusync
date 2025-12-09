// src/types/confetti.d.ts
declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    scalar?: number;
    angle?: number;
    startVelocity?: number;
    ticks?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
    [key: string]: unknown; 
  }

  function confetti(options?: ConfettiOptions): Promise<null>;
  function confetti(options?: ConfettiOptions): void;

  export = confetti;
}