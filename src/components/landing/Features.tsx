import { motion } from 'framer-motion';
import {
  Target, Brain, Network, MessageCircle, BarChart3, Route, Star,
  type LucideIcon,
} from 'lucide-react';
import { FEATURES } from '../../data/mockData';

const iconMap: Record<string, LucideIcon> = {
  Target,
  Brain,
  Network,
  MessageCircle,
  BarChart3,
  Route,
};

export function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary-light text-sm font-semibold uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-4">
            Everything you need to learn smarter
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            From AI-powered gap detection to interactive concept maps, GapLearning AI gives students and teachers the tools to succeed.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon] || Star;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-primary-light" />
                </div>
                <h3 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
