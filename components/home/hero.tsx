"use client";

import Link from "next/link";
import { Pill } from "./pill";
import { Button } from "../ui/button";
import { useEffect, useRef, useState } from "react";

// Interactive particle background component
const InteractiveParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      originalX: number;
      originalY: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.originalX = this.x;
        this.originalY = this.y;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.size = Math.random() * 4 + 0.5;
        const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#06b6d4'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(canvasWidth: number, canvasHeight: number) {
        // Natural floating motion
        this.vx += (Math.random() - 0.5) * 0.02;
        this.vy += (Math.random() - 0.5) * 0.02;

        // Mouse interaction with stronger repulsion
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 200;

        if (distance < maxDistance && distance > 0) {
          const force = (maxDistance - distance) / maxDistance;
          const angle = Math.atan2(dy, dx);
          const repulsionStrength = force * force * 0.8;
          this.vx -= Math.cos(angle) * repulsionStrength;
          this.vy -= Math.sin(angle) * repulsionStrength;
        }

        // Gentle return to original position
        this.vx += (this.originalX - this.x) * 0.002;
        this.vy += (this.originalY - this.y) * 0.002;

        // Apply velocity with less damping for more floating effect
        this.vx *= 0.995;
        this.vy *= 0.995;

        // Limit velocity to prevent particles from moving too fast
        const maxVelocity = 3;
        if (Math.abs(this.vx) > maxVelocity) this.vx = Math.sign(this.vx) * maxVelocity;
        if (Math.abs(this.vy) > maxVelocity) this.vy = Math.sign(this.vy) * maxVelocity;

        this.x += this.vx;
        this.y += this.vy;

        // Keep particles within bounds
        if (this.x < 0 || this.x > canvasWidth) this.vx *= -0.5;
        if (this.y < 0 || this.y > canvasHeight) this.vy *= -0.5;
        this.x = Math.max(0, Math.min(canvasWidth, this.x));
        this.y = Math.max(0, Math.min(canvasHeight, this.y));
      }

      draw(context: CanvasRenderingContext2D) {
        // Add glow effect
        context.shadowColor = this.color;
        context.shadowBlur = 10;

        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fillStyle = this.color + '90';
        context.fill();

        // Reset shadow
        context.shadowBlur = 0;
      }
    }

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });

      // Draw connections
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${0.2 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mousePos]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      onMouseMove={handleMouseMove}
      style={{ pointerEvents: 'auto' }}
    />
  );
};

// Custom liquid glass effect component
const LiquidGlass = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
      <div className="relative backdrop-blur-sm bg-white/10 rounded-lg border border-white/20 group-hover:bg-white/20 transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

export function Hero() {
  return (
    <div className="flex flex-col h-svh justify-between">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-950 to-blue-950" />

      {/* Interactive particle background */}
      <InteractiveParticles />

      <div className="pb-32 mt-auto text-center relative z-10">
        <Pill className="mb-6 bg-blue-500/20 border-blue-400/30 text-blue-200">AI-POWERED TRAVEL</Pill>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent font-mono">
          Explore the <br />
          <i className="font-light">world</i> smarter
        </h1>
        <p className="font-mono text-sm sm:text-base text-blue-100/80 text-balance mt-8 max-w-[500px] mx-auto">
          AI-powered travel planning that finds the best flights, hotels, and experiences
          tailored to your preferences and budget
        </p>

        <div className="flex justify-center mt-14">
          <Link href="/">
            <LiquidGlass>
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 text-white font-mono font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Planning Your Trip
              </Button>
            </LiquidGlass>
          </Link>
        </div>
      </div>
    </div>
  );
}
