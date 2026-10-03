import { expect, test } from './support/fixtures';

test.describe('routing and errors', () => {
  test('old portal links redirect', async ({ page }) => {
    await page.goto('/student');
    await expect(page).toHaveURL(/\/app$/);
    await page.goto('/teacher');
    await expect(page).toHaveURL(/\/app\/questions$/);
  });

  for (const path of ['/nope', '/app/does-not-exist', '/app/topics/unknown-topic', '/app/practice/sessions/unknown']) {
    test(`shows a 404 for ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: "This page doesn't exist" })).toBeVisible();
      await expect(page).toHaveTitle('Page not found · GapLearning');
      await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible();
    });
  }

  test('explains broken session links', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=nope');
    await expect(page.getByText('Topic not found')).toBeVisible();
    await page.goto('/app/practice/session?mode=diagnostic&subject=nope');
    await expect(page.getByText('Subject not found')).toBeVisible();
    await page.goto('/app/practice/session');
    await expect(page.getByText('Choose what to practice')).toBeVisible();
  });

  test('unknown API routes return JSON errors', async ({ request }) => {
    const response = await request.get('/api/nope');
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'not_found' } });
  });
});
