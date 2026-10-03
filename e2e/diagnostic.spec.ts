import { answerWithKeyboard } from './support/app';
import { expect, test } from './support/fixtures';

test('a full diagnostic can be taken with the keyboard and maps a learning path', async ({ page }) => {
  await page.goto('/app/practice/session?mode=diagnostic&subject=english');
  await expect(page).toHaveTitle('English Grammar diagnostic · GapLearning');
  for (let index = 1; index <= 8; index += 1) {
    await expect(page.getByText(`Question ${index} of 8`)).toBeVisible();
    // Alternate right and wrong so the engine has to adapt in both directions.
    await answerWithKeyboard(page, index % 3 === 0 ? 'wrong' : 'correct');
    await expect(page.getByRole('status').filter({ hasText: /Correct|Not quite/ })).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Diagnostic complete')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your path through this subject' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Question by question' })).toBeVisible();
  // Eight distinct questions: sessions never repeat themselves.
  await expect(page.locator('ol').last().getByRole('listitem')).toHaveCount(8);
});
