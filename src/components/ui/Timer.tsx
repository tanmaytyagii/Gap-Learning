import { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  running?: boolean;
  className?: string;
}

export function Timer({ initialSeconds, onTimeUp, running = true, className }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!running || seconds <= 0) return;

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          onTimeUp?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, seconds, onTimeUp]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds <= 60;
  const progress = (seconds / initialSeconds) * 100;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-semibold',
        isLow ? 'bg-danger/10 border-danger/30 text-red-400' : 'bg-white/5 border-white/10 text-text'
      )}>
        <Clock className="w-3.5 h-3.5" />
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div className="hidden sm:block w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', isLow ? 'bg-danger' : 'bg-primary')}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function useTimer(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setSeconds(initialSeconds);
    setRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const interval = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [running, seconds]);

  return { seconds, running, start, pause, reset, setRunning };
}
