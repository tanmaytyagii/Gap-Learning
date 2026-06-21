import type { ActivityItem, Testimonial, Feature, Benefit } from '../types';

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'High School Student',
    avatar: 'SC',
    content: 'GapLearning AI pinpointed exactly why I kept adding denominators wrong. The Socratic tutor helped me figure it out myself — I went from a C to an A in two weeks.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Mr. Rodriguez',
    role: 'Math Teacher, Lincoln High',
    avatar: 'MR',
    content: 'The teacher dashboard shows me which misconceptions are spreading across my class before the next test. The AI worksheet generator saves me hours every week.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Priya Patel',
    role: 'Computer Science Student',
    avatar: 'PP',
    content: 'The concept map makes learning feel like unlocking a skill tree. I can see exactly what I need to master next and why it matters.',
    rating: 5,
  },
  {
    id: '4',
    name: 'Dr. James Okonkwo',
    role: 'Education Researcher',
    avatar: 'JO',
    content: 'Finally, an adaptive platform that diagnoses the why behind errors, not just the what. This is the future of personalized learning.',
    rating: 5,
  },
];

export const FEATURES: Feature[] = [
  {
    id: 'gap-detection',
    icon: 'Target',
    title: 'AI Gap Detection',
    description: 'Our AI analyzes student work to identify specific misconceptions — not just wrong answers, but the reasoning behind them.',
  },
  {
    id: 'adaptive-assessments',
    icon: 'Brain',
    title: 'Adaptive Assessments',
    description: 'Questions dynamically adjust difficulty based on performance, ensuring every student is challenged at the right level.',
  },
  {
    id: 'concept-mapping',
    icon: 'Network',
    title: 'Concept Mapping',
    description: 'Visual knowledge graphs show dependencies between topics, helping students understand the learning path ahead.',
  },
  {
    id: 'socratic-tutor',
    icon: 'MessageCircle',
    title: 'Socratic AI Tutor',
    description: 'When students struggle, our AI tutor guides them with questions — never giving away answers, always building understanding.',
  },
  {
    id: 'teacher-insights',
    icon: 'BarChart3',
    title: 'Teacher Analytics',
    description: 'Class-wide dashboards reveal weak topics, at-risk students, and AI-generated teaching recommendations.',
  },
  {
    id: 'learning-paths',
    icon: 'Route',
    title: 'Personalized Paths',
    description: 'Every student gets a customized remediation route based on their unique knowledge gaps and learning pace.',
  },
];

export const BENEFITS: Benefit[] = [
  {
    id: '1',
    title: 'Learn Faster',
    description: 'Students focus only on what they don\'t know, cutting study time by up to 40%.',
    stat: '40%',
    statLabel: 'Time Saved',
  },
  {
    id: '2',
    title: 'Higher Retention',
    description: 'Socratic tutoring builds deep understanding that lasts beyond the next test.',
    stat: '2.3x',
    statLabel: 'Better Retention',
  },
  {
    id: '3',
    title: 'Teacher Efficiency',
    description: 'Automated gap analysis and worksheet generation free up hours for meaningful instruction.',
    stat: '5hrs',
    statLabel: 'Saved Weekly',
  },
  {
    id: '4',
    title: 'Proven Results',
    description: 'Students using adaptive remediation show measurable improvement within two weeks.',
    stat: '87%',
    statLabel: 'Improvement Rate',
  },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    type: 'mastery',
    title: 'Mastered Visualizing Fractions',
    description: 'Scored 100% on fraction visualization assessment',
    timestamp: '2 hours ago',
    subject: 'math',
  },
  {
    id: '2',
    type: 'gap',
    title: 'Gap Identified: Denominator Addition',
    description: 'AI detected direct denominator addition misconception',
    timestamp: 'Yesterday',
    subject: 'math',
  },
  {
    id: '3',
    type: 'assessment',
    title: 'Completed Physics Assessment',
    description: 'Net Force & Motion — 3/4 correct',
    timestamp: '2 days ago',
    subject: 'science',
  },
  {
    id: '4',
    type: 'recommendation',
    title: 'AI Recommendation',
    description: 'Review Equivalent Fractions before attempting unlike denominators',
    timestamp: '3 days ago',
    subject: 'math',
  },
  {
    id: '5',
    type: 'mastery',
    title: 'Mastered Present Tenses',
    description: 'Perfect score on English grammar module',
    timestamp: '4 days ago',
    subject: 'english',
  },
];

export const AI_RECOMMENDATIONS = [
  {
    id: '1',
    priority: 'high' as const,
    title: 'Review Equivalent Fractions',
    description: 'Your recent gap in unlike denominators suggests revisiting fraction scaling concepts.',
    action: 'Start Review',
    conceptId: 'frac_equiv',
  },
  {
    id: '2',
    priority: 'medium' as const,
    title: 'Practice Net Force Problems',
    description: 'Physics module shows 54% mastery. Focus on Newton\'s First Law applications.',
    action: 'Practice Now',
    conceptId: 'sci_net_force',
  },
  {
    id: '3',
    priority: 'low' as const,
    title: 'Explore Multiplying Fractions',
    description: 'You\'re ready for the next challenge once unlike denominators are mastered.',
    action: 'Preview Topic',
    conceptId: 'frac_multiply',
  },
];
