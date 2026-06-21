import { SUBJECT_CONCEPTS } from '../adaptive/data/knowledgeGraph';
import type { Question } from '../adaptive/models';

export type { Question } from '../adaptive/models';

export interface ChatMessage {
  sender: 'student' | 'tutor';
  text: string;
}

export const SUBJECTS = {
  math: { name: 'Mathematics', emoji: '📐', startConcept: 'frac_visual' },
  science: { name: 'Science & Physics', emoji: '⚡', startConcept: 'sci_force' },
  english: { name: 'English Grammar', emoji: '✍️', startConcept: 'eng_present' },
};

export const CONCEPTS = SUBJECT_CONCEPTS;

export const MISCONCEPTIONS: Record<string, { title: string; desc: string; remedy: string }> = {
  answered_eaten_not_remaining: {
    title: 'Question-Target Confusion',
    desc: 'The student represented the amount eaten instead of the amount remaining.',
    remedy: 'Underline the quantity requested, then label the numerator before calculating.',
  },
  answered_unshaded_not_shaded: {
    title: 'Part Selection Confusion',
    desc: 'The student counted the complementary, unshaded region.',
    remedy: 'Name the target region aloud and count only those parts for the numerator.',
  },
  numerator_denominator_reversal: {
    title: 'Numerator-Denominator Reversal',
    desc: 'The student reversed selected parts and total equal parts.',
    remedy: 'Rebuild the part-whole model: numerator is selected parts; denominator is all equal parts.',
  },
  denominator_ignored: {
    title: 'Denominator Ignored',
    desc: 'The answer gives a count but does not represent the size of the whole.',
    remedy: 'Practice pairing every part count with the total number of equal parts.',
  },
  additive_scaling_error: {
    title: 'Additive Scaling in Equivalence',
    desc: 'The student added to the numerator and denominator instead of preserving the ratio.',
    remedy: 'Use fraction bars to show that equivalent fractions multiply both terms by the same factor.',
  },
  unequal_scaling: {
    title: 'Unequal Fraction Scaling',
    desc: 'The numerator and denominator were changed by different factors.',
    remedy: 'Write one scale factor beside both the numerator and denominator before calculating.',
  },
  incomplete_simplification: {
    title: 'Incomplete Simplification',
    desc: 'The answer is equivalent but has not been reduced to lowest terms.',
    remedy: 'Find the greatest common factor and divide both terms until no common factor remains.',
  },
  whole_number_comparison: {
    title: 'Whole-Number Fraction Comparison',
    desc: 'The student compared numerators or denominators independently.',
    remedy: 'Rename both fractions with a common denominator or compare each with one-half.',
  },
  comparison_strategy_missing: {
    title: 'Missing Comparison Strategy',
    desc: 'The student does not yet recognize how unlike fractions can be compared.',
    remedy: 'Practice benchmark fractions and common-denominator visual models.',
  },
  direct_denom_addition: {
    title: 'Adding Denominators Directly',
    desc: 'The student added numerator and denominator pairs independently.',
    remedy: 'Use fraction bars to establish equal-sized parts before combining numerators.',
  },
  numerator_only_addition: {
    title: 'Adding Before Renaming',
    desc: 'The student added numerators while the fractions still represented different part sizes.',
    remedy: 'Require a common-denominator step before any addition step.',
  },
  cross_multiply_confusion: {
    title: 'Cross-Multiplication Confusion',
    desc: 'The student applied a comparison shortcut as a multiplication procedure.',
    remedy: 'Model fraction multiplication as parts of parts, then multiply straight across and simplify.',
  },
  force_motion_link: {
    title: 'Force-Motion Link Misconception',
    desc: 'The student believes constant motion requires a continuing net force.',
    remedy: 'Contrast velocity with acceleration using frictionless motion and Newton\'s first law.',
  },
  mass_weight_equivalence: {
    title: 'Mass vs. Weight Equivalence',
    desc: 'The student treats mass and gravitational weight as interchangeable.',
    remedy: 'Compare one object on Earth and the Moon: its matter stays fixed while weight changes.',
  },
  mass_dominant_collision: {
    title: 'Mass-Dominant Force Fallacy',
    desc: 'The student believes the larger object exerts the larger interaction force.',
    remedy: 'Use paired force arrows to demonstrate Newton\'s third law, then discuss acceleration separately.',
  },
  past_habit_confusion: {
    title: 'Habit vs. Progressive Confusion',
    desc: 'The student confused a repeated habit with an action happening now.',
    remedy: 'Sort sentences by time markers such as “every day” and “right now.”',
  },
  perfect_simple_past_overlap: {
    title: 'Perfect vs. Past Tense Misuse',
    desc: 'The student used simple past for a situation that remains connected to the present.',
    remedy: 'Draw timelines that contrast finished past events with events continuing through now.',
  },
  prerequisite_not_confirmed: {
    title: 'Prerequisite Not Confirmed',
    desc: 'An advanced error suggests that a prerequisite concept may be unstable.',
    remedy: 'Run a short prerequisite check before returning to the advanced concept.',
  },
  unknown: {
    title: 'Unclassified Reasoning Error',
    desc: 'The answer is incorrect but does not match a known distractor pattern.',
    remedy: 'Ask the student to explain the first step, then issue another targeted question.',
  },
};

export async function chatWithTutor(
  question: Question,
  misconceptionId: string,
  history: ChatMessage[],
  studentInput: string,
  apiKey?: string,
): Promise<string> {
  if (apiKey) {
    try {
      const conversation = history
        .map((message) => `${message.sender === 'student' ? 'Student' : 'Tutor'}: ${message.text}`)
        .join('\n');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `
You are a concise Socratic tutor. The student missed this question:
Question: ${question.question}
Correct answer: ${question.correctAnswer}
Diagnosed misconception: ${MISCONCEPTIONS[misconceptionId]?.title ?? 'unclassified error'}

Ask one targeted question that helps the student notice the error. Do not reveal the answer.
Conversation:
${conversation}
Student: ${studentInput}
` }] }],
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text
          ?? 'What does the first piece of information in the question tell you?';
      }
    } catch (error) {
      console.error('Tutor request failed; using local guidance.', error);
    }
  }

  if (misconceptionId === 'direct_denom_addition' || misconceptionId === 'numerator_only_addition') {
    return 'Before adding, do the denominators describe equal-sized pieces? What common denominator would make the pieces match?';
  }
  if (misconceptionId.includes('scaling')) {
    return 'What single multiplication factor changes the original denominator to the new one, and where else must you apply it?';
  }
  if (misconceptionId === 'force_motion_link') {
    return 'If the velocity is constant, what is the acceleration, and what does F = ma then say about net force?';
  }
  if (misconceptionId === 'perfect_simple_past_overlap') {
    return 'Does the sentence describe something completely finished, or something that still connects to the present?';
  }
  return 'Which part of the question determined your first step, and what rule did you apply to it?';
}

export async function generateWorksheet(
  misconceptionId: string,
  gapName: string,
  apiKey?: string,
): Promise<string[]> {
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Create three concise practice questions with answers for this learning gap: ${gapName} (${misconceptionId}). Return a printable Markdown list.` }] }],
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text.split(/\n\s*\n/).filter((item: string) => item.trim());
      }
    } catch (error) {
      console.error('Worksheet request failed; using local practice.', error);
    }
  }

  if (misconceptionId === 'direct_denom_addition') {
    return [
      '**1.** Solve $1/4 + 1/3$. **Answer:** $7/12$. Rename both fractions as twelfths first.',
      '**2.** Solve $2/5 + 1/2$. **Answer:** $9/10$. Use tenths as equal-sized parts.',
      '**3.** Explain why $1/6 + 2/3$ is not $3/9$. **Answer:** Convert $2/3$ to $4/6$, then add to get $5/6$.',
    ];
  }
  if (misconceptionId === 'force_motion_link') {
    return [
      '**1.** A puck moves at constant speed on frictionless ice. Find net force. **Answer:** 0 N.',
      '**2.** Draw forces on an object at terminal velocity. **Answer:** Equal upward drag and downward weight.',
      '**3.** A crate moves at constant speed while pushed. Find net force. **Answer:** 0 N.',
    ];
  }
  return [
    `**1. Identify:** Explain the rule behind ${gapName} in your own words.`,
    `**2. Apply:** Solve one worked example of ${gapName} and label every step.`,
    `**3. Check:** Create a common wrong answer for ${gapName}, then explain why it is wrong.`,
  ];
}

const API_KEY_STORAGE_KEY = 'gap_learning_gemini_key';

export const getStoredApiKey = (): string => localStorage.getItem(API_KEY_STORAGE_KEY) || '';

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const clearStoredApiKey = (): void => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};
