import type { Question } from '../adaptive';
import { apiRequest } from './api';

export interface HealthResponse {
  status: 'ok';
  version: string;
  questions: number;
  ai: { enabled: boolean; model: string | null };
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health', { signal, timeoutMs: 6000 });
}

export async function fetchQuestions(signal?: AbortSignal): Promise<Question[]> {
  const { questions } = await apiRequest<{ questions: Question[] }>('/questions', { signal, timeoutMs: 8000 });
  return questions;
}
