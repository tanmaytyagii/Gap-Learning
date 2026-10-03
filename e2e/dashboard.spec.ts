import { card, loadSample } from './support/app';
import { expect, test } from './support/fixtures';

test.describe('dashboard', () => {
  test('a new learner gets onboarding with real starting points', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveTitle('Dashboard · GapLearning');
    await expect(page.getByRole('link', { name: 'Mathematics', exact: true })).toHaveAttribute('href', /mode=diagnostic&subject=math/);
    await expect(page.getByRole('button', { name: 'Rate topics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add a topic' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explore with sample data' })).toBeVisible();
  });

  test('answers what to do now, what is weak, and whether it is improving', async ({ page }) => {
    await loadSample(page);
    await expect(page.getByText('You are exploring a')).toBeVisible();

    const next = card(page, 'Do this now');
    await expect(next.getByText('Recommended by the adaptive engine')).toBeVisible();
    await expect(next.getByText(/^Review \d+ topics? due$/)).toBeVisible();

    const struggling = card(page, "What you're struggling with");
    await expect(struggling.getByRole('listitem')).toHaveCount(3);
    await expect(struggling.getByText(/likely misconception:/).first()).toBeVisible();

    const improving = card(page, 'Are you improving?');
    await expect(improving.getByText('rose above 70% mastery')).toBeVisible();
    await expect(improving.getByText(/answers in this period, \d+% correct/)).toBeVisible();

    await next.getByRole('link', { name: 'Start review' }).first().click();
    await expect(page).toHaveURL(/mode=review/);
    await expect(page.getByText('Why this is in your review:')).toBeVisible();
  });
});
