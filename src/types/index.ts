export type SubjectId = 'math' | 'science' | 'english';
export type ConceptStatus = 'locked' | 'unlocked' | 'mastered' | 'gap';
export type AppView = 'landing' | 'student' | 'teacher' | 'assessment';

export interface ActivityItem {
  id: string;
  type: 'assessment' | 'mastery' | 'gap' | 'recommendation';
  title: string;
  description: string;
  timestamp: string;
  subject: SubjectId;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface Benefit {
  id: string;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}
