import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="primary" className="mb-6 normal-case tracking-normal">
              <Sparkles className="w-3 h-3" />
              AI-Powered Adaptive Learning
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-[family-name:var(--font-display)] leading-[1.1] tracking-tight mb-6">
              Close Your{' '}
              <span className="bg-gradient-to-r from-primary-light via-secondary to-primary-light bg-clip-text text-transparent">
                Knowledge Gaps
              </span>{' '}
              with AI
            </h1>

            <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-lg">
              GapLearning AI identifies exactly why you make mistakes, maps your concept dependencies, and builds a personalized learning path — so you master what matters.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to="/student">
                <Button size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                  Start Assessment
                </Button>
              </Link>
              <Link to="/student">
                <Button variant="secondary" size="lg" icon={<Play className="w-5 h-5" />}>
                  View Demo
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {['Free to try', 'No account required', 'Gemini AI powered'].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card rounded-3xl p-6 shadow-2xl shadow-primary/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider">Live Dashboard Preview</p>
                  <p className="font-semibold font-[family-name:var(--font-display)]">Student Progress</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Mastery', value: '68%', color: 'text-success' },
                  { label: 'XP Earned', value: '340', color: 'text-primary-light' },
                  { label: 'Streak', value: '5d', color: 'text-warning' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
                    <p className={`text-xl font-bold font-[family-name:var(--font-display)] ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-text-secondary uppercase mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {[
                  { topic: 'Visualizing Fractions', progress: 100, status: 'Mastered' },
                  { topic: 'Equivalent Fractions', progress: 74, status: 'In Progress' },
                  { topic: 'Unlike Denominators', progress: 48, status: 'Gap Detected' },
                ].map((item) => (
                  <div key={item.topic} className="bg-white/3 rounded-xl p-3 border border-white/6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{item.topic}</span>
                      <span className="text-xs text-text-secondary">{item.status}</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full rounded-full ${item.progress === 100 ? 'bg-success' : item.progress < 60 ? 'bg-warning' : 'bg-primary'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-4 glass-card rounded-xl px-4 py-2 shadow-lg"
            >
              <p className="text-xs text-text-secondary">AI Gap Detected</p>
              <p className="text-sm font-semibold text-warning">Denominator Addition</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
