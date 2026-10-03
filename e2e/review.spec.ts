import { card, finishSession, loadSample } from './support/app';
import { expect, test } from './support/fixtures';

test('review explains why each topic is due and how the session moved the schedule', async ({ page }) => {
  await loadSample(page);
  await page.goto('/app/practice');
  const reviewCard = card(page, 'Spaced review');
  await expect(reviewCard.getByRole('list', { name: 'Topics due' }).getByRole('listitem').first()).toContainText(/(passed|missed) .*, interval \d+d/);

  await reviewCard.getByRole('link', { name: 'Start review' }).click();
  await expect(page.getByText('Why this is in your review:')).toBeVisible();
  await expect(page.getByText(/Pass now and the next review moves out to \d+ days?; miss it and it returns after 1 day\./)).toBeVisible();

  await finishSession(page, 'correct');
  await expect(page.getByText('Review complete')).toBeVisible();
  const schedule = card(page, 'When these come back for review');
  await expect(schedule.getByText(/Passed: interval grew from \d+ to \d+ days/).first()).toBeVisible();
});

test('review explains when nothing is due', async ({ page }) => {
  await page.goto('/app/practice/session?mode=review');
  await expect(page.getByText('Nothing is due for review')).toBeVisible();
  await expect(page.getByText('Topics join the review schedule after you practice them.')).toBeVisible();
});
