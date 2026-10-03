import type { Difficulty, Misconception, Question } from '../adaptive';
import type { Concept } from '../domain/types';
import { apiRequest } from './api';

export interface ChatTurn {
  role: 'learner' | 'tutor';
  text: string;
}

export interface TutorRequest {
  concept: Pick<Concept, 'name' | 'learningObjective'>;
  question: Pick<Question, 'question' | 'options' | 'correctAnswer'>;
  selectedAnswer: string;
  misconception: Pick<Misconception, 'title' | 'explanation'> | null;
  reasoning: string;
  history: ChatTurn[];
  message: string;
}

export async function askTutor(request: TutorRequest, signal?: AbortSignal): Promise<string> {
  const { reply } = await apiRequest<{ reply: string }>('/ai/tutor', { method: 'POST', body: request, signal, timeoutMs: 30000 });
  return reply;
}

export interface ExplainRequest {
  concept: Pick<Concept, 'name' | 'description' | 'learningObjective'> & { subject: string; keyPoints: string[] };
  misconceptions: Pick<Misconception, 'title' | 'description'>[];
  notes: string;
}

export async function explainConcept(request: ExplainRequest, signal?: AbortSignal): Promise<string> {
  const { explanation } = await apiRequest<{ explanation: string }>('/ai/explain', { method: 'POST', body: request, signal, timeoutMs: 45000 });
  return explanation;
}

export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  solutionSteps: string;
  difficulty: Difficulty;
  distractors: { option: string; misconception: { title: string; explanation: string } }[];
}

export interface GenerateRequest {
  concept: Pick<Concept, 'name' | 'description' | 'learningObjective'> & { subject: string };
  count: number;
  difficulty: Difficulty;
  sourceText: string;
}

export async function generateQuestions(request: GenerateRequest, signal?: AbortSignal): Promise<GeneratedQuestion[]> {
  const { questions } = await apiRequest<{ questions: GeneratedQuestion[] }>('/ai/questions', {
    method: 'POST', body: request, signal, timeoutMs: 60000,
  });
  return questions;
}

/**
 * Deterministic Socratic prompts used when the AI service is unavailable. They lean on the
 * question's hint, the diagnosed misconception's remedy, and the worked solution, in that order.
 */
export function offlineTutorReply(turn: number, question: Question, misconception: Misconception | null): string {
  const prompts = [
    question.hint ? `Here is a nudge: ${question.hint} How does that change your first step?` : null,
    misconception && misconception.id !== 'unknown'
      ? `This mistake is often ${misconception.title.toLowerCase()}. A strategy that helps: ${misconception.remedy} Try it on this question. What do you get?`
      : 'Try explaining each step of your method out loud. Which step are you least sure about?',
    'Now compare your reasoning with the worked solution under the feedback. Which step is different from yours?',
  ].filter((prompt): prompt is string => Boolean(prompt));
  return prompts[Math.min(turn, prompts.length - 1)];
}
