import { motion } from 'framer-motion';
import { BENEFITS } from '../../data/mockData';

export function Benefits() {
  return (
    <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8 bg-surface/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-secondary text-sm font-semibold uppercase tracking-wider mb-3">Benefits</p>
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-4">
            Real impact, measurable results
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            GapLearning AI transforms how students learn and how teachers teach — with data-driven insights at every step.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 text-center hover:border-white/15 transition-colors"
            >
              <div className="text-4xl font-bold font-[family-name:var(--font-display)] bg-gradient-to-r from-primary-light to-secondary bg-clip-text text-transparent mb-1">
                {benefit.stat}
              </div>
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-4">{benefit.statLabel}</p>
              <h3 className="font-semibold mb-2">{benefit.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
