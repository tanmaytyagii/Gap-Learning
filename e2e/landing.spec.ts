import { expect, test } from './support/fixtures';

test.describe('landing page', () => {
  test('explains the product with a real diagnosis and opens the app', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GapLearning/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the gaps in what you know');
    // The hero example is built from the real question bank and misconception catalog.
    await expect(page.getByText('Not quite: Combining Denominators')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Source code on GitHub (opens in a new tab)' })).toHaveAttribute('href', /github\.com\/tanmaytyagii\/Gap-Learning/);

    await page.getByRole('link', { name: 'How it works', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'How it works' })).toBeInViewport();

    await page.getByRole('link', { name: 'Open the app' }).first().click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Find your first gaps' })).toBeVisible();
  });
});
