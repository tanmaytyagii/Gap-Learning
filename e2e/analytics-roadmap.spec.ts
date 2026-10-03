import { card, loadSample } from './support/app';
import { expect, test } from './support/fixtures';

test.describe('analytics and roadmap', () => {
  test('analytics is empty without answers', async ({ page }) => {
    await page.goto('/app/analytics');
    await expect(page.getByText('Nothing to analyze yet')).toBeVisible();
  });

  test('analytics charts have table views and respond to the date range', async ({ page }) => {
    await loadSample(page);
    await page.goto('/app/analytics');
    await expect(page.getByRole('img', { name: /Mastery over the last 30 days/ })).toBeVisible();
    const mastery = card(page, 'Mastery over time');
    await mastery.getByRole('radio', { name: 'Table' }).click();
    await expect(mastery.getByRole('table')).toBeVisible();
    await expect(mastery.getByRole('columnheader', { name: 'Mathematics' })).toBeVisible();
    await mastery.getByRole('radio', { name: 'Chart' }).click();

    await page.getByRole('radio', { name: 'Last 90 days' }).click();
    await expect(page.getByRole('img', { name: /Mastery over the last 90 days/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Most frequent misconceptions' })).toBeVisible();
  });

  test('roadmap shows prerequisites and the next step', async ({ page }) => {
    await loadSample(page);
    await page.goto('/app/roadmap');
    await page.getByRole('radio', { name: 'Physics' }).click();
    await expect(page).toHaveURL(/subject=science/);
    await expect(page.getByRole('heading', { name: 'Physics prerequisite map' })).toBeVisible();
    await expect(page.getByText('Next', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: /^Action & Reaction:/ }).click();
    await expect(page.getByRole('heading', { name: 'Action & Reaction', level: 1 })).toBeVisible();
  });
});
