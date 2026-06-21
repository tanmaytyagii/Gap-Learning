import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface NavbarProps {
  variant?: 'landing' | 'app';
}

export function Navbar({ variant = 'landing' }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isLanding = variant === 'landing';

  const links = isLanding
    ? [
        { href: '#features', label: 'Features' },
        { href: '#benefits', label: 'Benefits' },
        { href: '#testimonials', label: 'Testimonials' },
      ]
    : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 no-print">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 glass-card rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold font-[family-name:var(--font-display)] text-sm sm:text-base">GapLearning AI</span>
              <span className="hidden sm:block text-[10px] text-text-secondary">Adaptive Learning Platform</span>
            </div>
          </Link>

          {isLanding && (
            <div className="hidden md:flex items-center gap-8">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-text-secondary hover:text-text transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            {!isLanding && location.pathname.startsWith('/student') && (
              <Link to="/teacher">
                <Button variant="ghost" size="sm">Teacher Portal</Button>
              </Link>
            )}
            {!isLanding && location.pathname.startsWith('/teacher') && (
              <Link to="/student">
                <Button variant="ghost" size="sm">Student Portal</Button>
              </Link>
            )}
            {isLanding ? (
              <>
                <Link to="/student">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/student">
                  <Button size="sm">Start Assessment</Button>
                </Link>
              </>
            ) : (
              <Link to="/">
                <Button variant="secondary" size="sm">Home</Button>
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mx-4 mt-2 glass-card rounded-2xl p-4 space-y-3"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block py-2 text-sm text-text-secondary hover:text-text"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link to="/student" onClick={() => setMobileOpen(false)}>
                <Button className="w-full" size="sm">Start Assessment</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
