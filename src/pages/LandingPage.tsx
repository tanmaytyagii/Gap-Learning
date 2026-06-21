import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { Benefits } from '../components/landing/Benefits';
import { Testimonials } from '../components/landing/Testimonials';

export function LandingPage() {
  return (
    <div className="min-h-screen gradient-mesh">
      <Navbar variant="landing" />
      <Hero />
      <Features />
      <Benefits />
      <Testimonials />

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-4">
              Ready to transform your learning?
            </h2>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
              Join thousands of students using AI to identify gaps and master concepts faster.
            </p>
            <Link to="/student">
              <Button size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Get Started Free
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
