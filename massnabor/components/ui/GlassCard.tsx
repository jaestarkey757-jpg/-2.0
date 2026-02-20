import React, { useRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SoundManager } from '../SoundManager';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  noPadding?: boolean;
}

export const GlassCard: React.FC<Props> = ({ children, className, noPadding, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [shadow, setShadow] = useState('');

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation (-5 to 5 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -3; // Invert Y for correct tilt
    const rotateY = ((x - centerX) / centerX) * 3;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setShadow('0 20px 40px rgba(0,0,0,0.4)');
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setShadow('');
  };

  return (
    <div 
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={twMerge(
        "bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 ease-out",
        !noPadding && "p-6",
        className
      )}
      style={{
        transform,
        boxShadow: shadow || '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        transformStyle: 'preserve-3d'
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ 
  className, variant = 'secondary', onClick, ...props 
}) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30",
    secondary: "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10",
    danger: "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30",
    ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-white/5"
  };
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      SoundManager.playClick();
      if (onClick) onClick(e);
  };
  
  return (
    <button onClick={handleClick} className={twMerge(base, variants[variant], className)} {...props} />
  );
};