import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'primary' | 'success' | 'warning' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const glowStyles = {
  primary: 'shadow-[0_0_30px_rgba(79,70,229,0.15)] border-primary/30',
  success: 'shadow-[0_0_30px_rgba(16,185,129,0.15)] border-success/30',
  warning: 'shadow-[0_0_30px_rgba(245,158,11,0.15)] border-warning/30',
  none: '',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, hover = false, glow = 'none', padding = 'none' }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'glass-card rounded-2xl overflow-hidden',
        glowStyles[glow],
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-5 border-b border-white/8 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}
