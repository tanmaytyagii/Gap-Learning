import { Link } from 'react-router-dom';
import { GraduationCap, Mail } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Student Portal', href: '/student' },
    { label: 'Teacher Portal', href: '/teacher' },
    { label: 'Pricing', href: '/#benefits' },
  ],
  Resources: [
    { label: 'Documentation', href: 'https://github.com' },
    { label: 'API Reference', href: 'https://github.com' },
    { label: 'Blog', href: 'https://github.com' },
    { label: 'Support', href: 'mailto:support@gapplearning.ai' },
  ],
  Company: [
    { label: 'About', href: '/#testimonials' },
    { label: 'Careers', href: 'https://github.com' },
    { label: 'Privacy', href: 'https://github.com' },
    { label: 'Terms', href: 'https://github.com' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-surface/50 mt-20 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold font-[family-name:var(--font-display)] text-lg">GapLearning AI</span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed max-w-sm mb-6">
              AI-powered adaptive learning that identifies knowledge gaps, generates personalized assessments, and maps your path to mastery.
            </p>
            <div className="flex gap-3">
              {['GitHub', 'X', 'LinkedIn', 'Email'].map((label, i) => (
                <a
                  key={label}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text hover:border-white/20 transition-colors text-xs font-medium"
                  aria-label={label}
                >
                  {i === 3 ? <Mail className="w-4 h-4" /> : label[0]}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link to={link.href} className="text-sm text-text-secondary hover:text-text transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-text-secondary hover:text-text transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-muted">© 2026 GapLearning AI. Built for educational innovation.</p>
          <p className="text-xs text-text-muted">Made with React, TypeScript & Gemini AI</p>
        </div>
      </div>
    </footer>
  );
}
