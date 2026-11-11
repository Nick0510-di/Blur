/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface SpeedLinesOverlayProps {
  speedKmh: number;
  maxSpeedKmh: number;
  isNitro: boolean;
  isDrifting: boolean;
}

export const SpeedLinesOverlay: React.FC<SpeedLinesOverlayProps> = ({
  speedKmh,
  maxSpeedKmh,
  isNitro,
  isDrifting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const ctx = canvas.getContext('2d')!;

    // Resize handler
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Particle streaks
    const streakCount = 36;
    const streaks: {
      angle: number;
      dist: number;
      length: number;
      speed: number;
      color: string;
      alpha: number;
    }[] = [];

    const colors = ['#00F0FF', '#FFFFFF', '#38BDF8', '#FF007F'];

    for (let i = 0; i < streakCount; i++) {
      streaks.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 0.8 + 0.2, // relative distance from center (0 to 1)
        length: Math.random() * 60 + 30,
        speed: Math.random() * 0.03 + 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ratio = Math.min(1.0, Math.max(0, speedKmh - 60) / (maxSpeedKmh - 60));
      const activeIntensity = isNitro ? 1.0 : ratio;

      if (activeIntensity > 0.05) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

        ctx.lineWidth = isNitro ? 2.5 : 1.5;

        for (const s of streaks) {
          s.dist += s.speed * (activeIntensity * 1.5 + (isNitro ? 0.8 : 0));
          if (s.dist > 1.1) {
            s.dist = Math.random() * 0.25 + 0.15;
            s.angle = Math.random() * Math.PI * 2;
          }

          const rInner = s.dist * maxRadius * 0.65;
          const rOuter = rInner + s.length * activeIntensity * (isNitro ? 1.8 : 1.0);

          const x1 = centerX + Math.cos(s.angle) * rInner;
          const y1 = centerY + Math.sin(s.angle) * rInner;
          const x2 = centerX + Math.cos(s.angle) * rOuter;
          const y2 = centerY + Math.sin(s.angle) * rOuter;

          ctx.strokeStyle = s.color;
          ctx.globalAlpha = s.alpha * activeIntensity * (isNitro ? 0.9 : 0.6);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, [speedKmh, maxSpeedKmh, isNitro, isDrifting]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 w-full h-full"
    />
  );
};
