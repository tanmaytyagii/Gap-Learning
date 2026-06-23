import type { Question } from '../adaptive/models';

const API_BASE_URL = 'http://localhost:5000/api';

export const fetchQuestions = async (): Promise<Question[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`);
    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
};

export const addQuestion = async (questionData: Partial<Question>): Promise<Question | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });
    if (!response.ok) {
      throw new Error('Failed to add question');
    }
    const result = await response.json();
    return result.question;
  } catch (error) {
    console.error('Error adding question:', error);
    return null;
  }
};
