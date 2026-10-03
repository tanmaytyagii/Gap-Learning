import { answer, card, finishSession, misconceptionTitle } from './support/app';
import { expect, test } from './support/fixtures';

test.describe('practice', () => {
  test('a wrong answer walks through verdict, misconception, key idea, and next step', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=frac_operations&count=4&difficulty=medium');
    await expect(page).toHaveTitle('Fraction Operations · GapLearning');
    await expect(page.getByText('Question 1 of 4')).toBeVisible();

    const { question, chosen } = await answer(page, 'wrong');
    const feedback = page.getByRole('status').filter({ hasText: 'Not quite' });
    await expect(feedback).toBeVisible();
    await expect(feedback.getByText(`Misconception: ${misconceptionTitle(question.misconceptionMap[chosen])}`)).toBeVisible();
    await expect(feedback.getByText('Try this:')).toBeVisible();
    await expect(page.getByText('Key idea:')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Full lesson (opens in a new tab)' })).toHaveAttribute('target', '_blank');
    // The worked solution is available but collapsed, so the feedback stays short.
    await expect(page.getByText('Worked solution')).toBeVisible();
    await expect(page.locator('details').first()).not.toHaveAttribute('open', '');
    await expect(page.getByText('Next step', { exact: true })).toBeVisible();
    await expect(page.getByText('An easier Fraction Operations question (easy) to rebuild the idea first.')).toBeVisible();

    await page.getByRole('button', { name: 'Next question' }).click();
    await expect(page.getByText('Question 2 of 4')).toBeVisible();
  });

  test('a correct answer keeps feedback short and raises difficulty', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=frac_equiv&count=4&difficulty=easy');
    await answer(page, 'correct');
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await expect(page.getByText('Key idea:')).toHaveCount(0);
    await expect(page.getByText('A harder Equivalent Fractions question (medium) to confirm you have it.')).toBeVisible();
  });

  test('a finished session reports mastery changes and the review schedule', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=sci_force&count=4');
    await finishSession(page, 'correct');
    await expect(page.getByText('Practice complete')).toBeVisible();
    await expect(page.getByText('4 / 4')).toBeVisible();
    const changes = card(page, 'Mastery changes');
    await expect(changes.getByText('new')).toBeVisible();
    const schedule = card(page, 'When these come back for review');
    await expect(schedule.getByText('Added to your reviews: 3 days between reviews')).toBeVisible();
    await expect(schedule.getByText(/Next review in 3 days/)).toBeVisible();

    await page.goto('/app/practice');
    const history = page.getByRole('table');
    await expect(history.getByRole('link', { name: 'Concept of Force', exact: true })).toBeVisible();
    await history.getByRole('link', { name: 'Concept of Force', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Concept of Force', level: 1 })).toBeVisible();
    await expect(page.getByText('Current review schedule')).toBeVisible();
  });

  test('ending early keeps the answers and asks first', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=eng_past&count=6');
    await answer(page, 'correct');
    await page.getByRole('button', { name: 'End session' }).click();
    const confirm = page.getByRole('dialog', { name: 'End this session?' });
    await expect(confirm.getByText('Your 1 answer is already saved')).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
    await page.getByRole('button', { name: 'End session' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'End session' }).click();
    await expect(page.getByText('Practice complete')).toBeVisible();
    await expect(page.getByText('1 / 1')).toBeVisible();
  });
});
