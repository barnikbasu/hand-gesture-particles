import React, { useEffect, useRef, useMemo } from 'react';
import { Results } from '@mediapipe/hands';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ParticleCanvasProps {
  handResults: Results | null;
  theme: 'neon' | 'ethereal' | 'matrix' | 'fire' | 'custom';
  mode: 'attract' | 'repel' | 'vortex' | 'shatter';
  customColors?: string[];
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ handResults, theme, mode, customColors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>(0);

  const themeColors = useMemo(() => {
    if (theme === 'custom' && customColors && customColors.length > 0) return customColors;
    switch (theme) {
      case 'neon': return ['#00f2ff', '#00ff9d', '#ff00ea', '#fffb00'];
      case 'ethereal': return ['#ffffff', '#e0e0ff', '#f0f0ff', '#d0d0ff'];
      case 'matrix': return ['#00ff41', '#008f11', '#003b00', '#0d0208'];
      case 'fire': return ['#ff4d00', '#ff9e00', '#ff0000', '#ffff00'];
      default: return ['#ffffff'];
    }
  }, [theme, customColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const count = Math.min(window.innerWidth * 0.5, 800);
      particles.current = Array.from({ length: count }, () => createParticle());
    };

    const createParticle = (x?: number, y?: number): Particle => {
      const maxLife = 100 + Math.random() * 100;
      return {
        x: x ?? Math.random() * canvas.width,
        y: y ?? Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        color: themeColors[Math.floor(Math.random() * themeColors.length)],
        life: maxLife,
        maxLife,
      };
    };

    const update = () => {
      ctx.fillStyle = theme === 'matrix' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const hands = handResults?.multiHandLandmarks || [];

      particles.current.forEach((p, i) => {
        // Basic movement
        p.x += p.vx;
        p.y += p.vy;

        // Friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Interaction
        hands.forEach((hand) => {
          const indexTip = hand[8]; // Index finger tip
          const hx = (1 - indexTip.x) * canvas.width;
          const hy = indexTip.y * canvas.height;

          const dx = hx - p.x;
          const dy = hy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = Math.max(0, (200 - dist) / 200);

          if (mode === 'attract') {
            p.vx += (dx / dist) * force * 0.5;
            p.vy += (dy / dist) * force * 0.5;
          } else if (mode === 'repel') {
            p.vx -= (dx / dist) * force * 1.5;
            p.vy -= (dy / dist) * force * 1.5;
          } else if (mode === 'vortex') {
            p.vx += (dy / dist) * force * 2;
            p.vy -= (dx / dist) * force * 2;
          } else if (mode === 'shatter') {
            if (dist < 50) {
              p.vx += (Math.random() - 0.5) * 20;
              p.vy += (Math.random() - 0.5) * 20;
            }
          }
        });

        // Boundary check
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fill();
        ctx.globalAlpha = 1;

        p.life -= 0.5;
        if (p.life <= 0) {
          particles.current[i] = createParticle();
        }
      });

      animationFrameId.current = requestAnimationFrame(update);
    };

    window.addEventListener('resize', resize);
    resize();
    update();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [handResults, theme, mode, themeColors]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full bg-black cursor-none"
      id="particle-canvas"
    />
  );
};
