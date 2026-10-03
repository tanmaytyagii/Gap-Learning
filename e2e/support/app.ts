import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

interface BankQuestion {
  id: string;
  concept: string;
  question: string;
  options: string[];
  correctAnswer: string;
  misconceptionMap: Record<string, string>;
}

interface Misconception {
  id: string;
  title: string;
}

const root = path.resolve(import.meta.dirname, '..', '..');
export const bank: BankQuestion[] = JSON.parse(fs.readFileSync(path.join(root, 'shared/question-bank.json'), 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'shared/curriculum.json'), 'utf8'));
export const misconceptions: Misconception[] = curriculum.misconceptions;

export function misconceptionTitle(id: string): string {
  return misconceptions.find((item) => item.id === id)!.title;
}

/**
 * The question currently on screen, looked up in the curated bank by its stem and its set of
 * options (some stems are shared, and options are displayed in a shuffled order).
 */
export async function currentQuestion(page: Page): Promise<BankQuestion> {
  const text = (await page.locator('form legend').first().textContent())?.trim();
  const options = await page.locator('form input[name="answer"]').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  const key = (values: string[]) => [...values].sort().join('\n');
  const question = bank.find((item) => item.question === text && key(item.options) === key(options));
  if (!question) throw new Error(`Question not found in the curated bank: ${text} [${options.join(' | ')}]`);
  return question;
}

/**
 * Answers the current question correctly or with a misconception-tagged distractor. The engine
 * breaks ties between equally good questions randomly, so tests decide outcomes by reading the
 * question rather than assuming which one appears.
 */
export async function answer(page: Page, outcome: 'correct' | 'wrong'): Promise<{ question: BankQuestion; chosen: string }> {
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible();
  const question = await currentQuestion(page);
  const chosen = outcome === 'correct'
    ? question.correctAnswer
    : Object.keys(question.misconceptionMap)[0] ?? question.options.find((option) => option !== question.correctAnswer)!;
  await page.getByRole('radio', { name: chosen, exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Check answer' }).click();
  return { question, chosen };
}

/** Answers using only the keyboard: the option's number key, then Enter. */
export async function answerWithKeyboard(page: Page, outcome: 'correct' | 'wrong'): Promise<BankQuestion> {
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible();
  const question = await currentQuestion(page);
  const chosen = outcome === 'correct'
    ? question.correctAnswer
    : question.options.find((option) => option !== question.correctAnswer)!;
  const displayed = await page.locator('form input[name="answer"]').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  await page.keyboard.press(String(displayed.indexOf(chosen) + 1));
  await expect(page.getByRole('radio', { name: chosen, exact: true })).toBeChecked();
  await page.keyboard.press('Enter');
  return question;
}

/** Answers every remaining question in the session and opens the results. */
export async function finishSession(page: Page, outcome: 'correct' | 'wrong' = 'correct') {
  for (let index = 0; index < 12; index += 1) {
    await answer(page, outcome);
    const results = page.getByRole('button', { name: 'See results' });
    const next = page.getByRole('button', { name: 'Next question' });
    await expect(results.or(next)).toBeVisible();
    if (await results.isVisible()) {
      await results.click();
      return;
    }
    await next.click();
  }
  throw new Error('Session did not finish within 12 questions');
}

/** The card (rounded panel) that contains a heading with this exact text (or matching this pattern). */
export function card(page: Page, heading: string | RegExp) {
  return page.getByRole('heading', { name: heading, exact: typeof heading === 'string' })
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " rounded-xl ")][1]');
}

/** Loads the clearly labeled sample workspace through the onboarding screen. */
export async function loadSample(page: Page) {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Explore with sample data' }).click();
  await expect(page.getByText('Sample workspace loaded')).toBeVisible();
}
