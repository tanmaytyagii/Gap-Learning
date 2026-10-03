import { answer, loadSample } from './support/app';
import { expect, test } from './support/fixtures';

const PAGES = [
  '/', '/app', '/app/gaps', '/app/topics', '/app/topics/frac_operations', '/app/roadmap', '/app/goals', '/app/practice',
  '/app/analytics', '/app/questions', '/app/settings', '/app/practice/session?mode=review',
];

test.describe('mobile (390px)', () => {
  test('no page scrolls sideways', async ({ page }) => {
    await loadSample(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('main, #root > div').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      // clientWidth is the layout viewport; innerWidth grows to fit overflow in mobile emulation and
      // would hide the very problem this test looks for.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test('navigation drawer traps focus and closes after navigating', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();

    await page.getByRole('button', { name: 'Open navigation' }).click();
    await drawer.getByRole('link', { name: /^Gaps/ }).click();
    await expect(page).toHaveURL(/\/app\/gaps$/);
    await expect(drawer).toBeHidden();
  });

  test('practice works with touch', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=frac_equiv&difficulty=easy');
    await answer(page, 'correct');
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next question' }).tap();
    await expect(page.getByText('Question 2 of 6')).toBeVisible();
  });
});
