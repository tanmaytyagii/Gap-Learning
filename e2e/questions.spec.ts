import { expect, test } from './support/fixtures';

test.describe('question bank', () => {
  test('writes, validates, edits, and deletes your own questions', async ({ page }) => {
    await page.goto('/app/questions?concept=frac_equiv');
    await expect(page.getByText(/66 curated questions from the server/)).toBeVisible();
    await page.getByRole('button', { name: 'Write a question' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Write a question' });

    await dialog.getByRole('button', { name: 'Add question' }).click();
    await expect(dialog.getByText('Write a question of 5–500 characters.')).toBeVisible();

    // Same wording as a curated question on this topic is rejected.
    await dialog.getByLabel('Question').fill('which fraction is equivalent to 1/2');
    for (const [index, value] of ['1/4', '2/4', '3/4', '4/4'].entries()) await dialog.getByLabel(`Option ${index + 1}`, { exact: true }).fill(value);
    await dialog.getByRole('button', { name: 'Add question' }).click();
    await expect(dialog.getByText('This topic already has a question with the same wording.')).toBeVisible();

    await dialog.getByLabel('Question').fill('Which fraction equals 3/9?');
    await dialog.getByLabel('Option 1', { exact: true }).fill('1/3');
    await dialog.getByLabel('Option 2', { exact: true }).fill('1/3');
    await dialog.getByRole('button', { name: 'Add question' }).click();
    await expect(dialog.getByText('Options must be different from each other.')).toBeVisible();
    await dialog.getByLabel('Option 2', { exact: true }).fill('3/3');
    await dialog.getByLabel('Option 3', { exact: true }).fill('9/3');
    await dialog.getByLabel('Option 4', { exact: true }).fill('6/12');
    await dialog.getByLabel('Misconception behind option 3').selectOption({ label: 'Numerator–Denominator Reversal' });
    await dialog.getByRole('button', { name: 'Add question' }).click();
    await expect(page.getByText('Question added')).toBeVisible();

    await page.getByRole('radio', { name: 'Written by you' }).click();
    const row = page.getByRole('listitem').filter({ hasText: 'Which fraction equals 3/9?' });
    await row.getByRole('button', { name: 'Show options' }).click();
    await expect(row.getByText('catches Numerator–Denominator Reversal')).toBeVisible();

    await row.getByRole('button', { name: 'Edit question' }).click();
    await page.getByRole('dialog', { name: 'Edit question' }).getByLabel('Question').fill('Which fraction is equal to 3/9?');
    await page.getByRole('dialog', { name: 'Edit question' }).getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Question updated')).toBeVisible();

    await page.getByRole('listitem').filter({ hasText: 'Which fraction is equal to 3/9?' }).getByRole('button', { name: 'Delete question' }).click();
    await page.getByRole('dialog', { name: 'Delete this question?' }).getByRole('button', { name: 'Delete question' }).click();
    await expect(page.getByText('No questions of your own here yet')).toBeVisible();
  });
});
