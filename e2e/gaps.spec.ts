import { answer, card } from './support/app';
import { expect, test } from './support/fixtures';

test.describe('gap detection and explanation', () => {
  test('a low self-rating creates a gap that explains how to clear it', async ({ page }) => {
    await page.goto('/app/gaps');
    await expect(page.getByText('No gaps detected yet')).toBeVisible();
    await page.getByRole('button', { name: 'Rate confidence' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Rate your confidence' });
    await dialog.getByRole('radiogroup', { name: 'Gravity, Mass & Weight' }).getByRole('radio', { name: /^1/ }).click();
    await dialog.getByRole('button', { name: 'Save 1 rating' }).click();
    await expect(page.getByText('Confidence ratings saved')).toBeVisible();

    const gapCard = card(page, /^Gravity, Mass & Weight/);
    await expect(gapCard.getByText('You rated your confidence 1/5')).toBeVisible();
    await expect(gapCard.getByText(/To clear: Answer 3 more questions/)).toBeVisible();
    await expect(gapCard.getByText(/Score 35 = 35 → Medium \(25–44\)/)).toBeVisible();
  });

  test('wrong answers create a gap with the misconception behind it', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=frac_operations&count=4&difficulty=medium');
    const { question, chosen } = await answer(page, 'wrong');
    const misconceptionId = question.misconceptionMap[chosen];
    await expect(page.getByText('Not quite', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'End session' }).click();

    await page.goto('/app/gaps');
    const gapCard = card(page, /^Fraction Operations/);
    await expect(gapCard.getByText(/Mastery is \d+% after 1 answer/)).toBeVisible();
    await expect(gapCard.getByText(/To clear: Reach 70% mastery .* About \d+ correct medium answers in a row/)).toBeVisible();
    expect(misconceptionId).toBeTruthy();
    // The untested prerequisites of a failing topic are flagged too.
    await expect(card(page, /^Equivalent Fractions/).getByText(/Untested prerequisite of Fraction Operations/)).toBeVisible();

    await gapCard.getByRole('link', { name: 'Full analysis' }).click();
    await expect(page).toHaveURL(/\/app\/topics\/frac_operations#gap$/);
    const analysis = page.locator('#gap');
    await expect(analysis.getByRole('heading', { name: 'Gap analysis' })).toBeVisible();
    await expect(analysis.getByText('Most frequent misconception · seen 1×')).toBeVisible();
    await expect(analysis.getByText('Fixed rules, no AI.')).toBeVisible();
    await expect(analysis.getByRole('img', { name: /Score \d+ of 100/ })).toBeVisible();
  });

  test('changing priority re-ranks a gap and says why', async ({ page }) => {
    await page.goto('/app/gaps');
    await page.getByRole('button', { name: 'Rate confidence' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Rate your confidence' });
    await dialog.getByRole('radiogroup', { name: 'Basic Fractions' }).getByRole('radio', { name: /^2/ }).click();
    await dialog.getByRole('button', { name: 'Save 1 rating' }).click();
    await page.getByLabel('Priority for Basic Fractions').selectOption('high');
    await expect(page.getByText("Adds 15 points to this topic's gap score.")).toBeVisible();
    await expect(page.getByText('Marked high priority')).toBeVisible();
  });

  test('links straight to the scoring rules', async ({ page }) => {
    await page.goto('/app/gaps#scoring');
    await expect(page.getByText('A topic becomes a gap when any of these is true')).toBeVisible();
  });
});
