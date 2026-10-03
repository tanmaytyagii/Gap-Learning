import { answer } from './support/app';
import { expect, test } from './support/fixtures';
import { TUTOR_REPLY } from './support/gemini-stub.cjs';

// The e2e server answers AI requests with a deterministic stub; no key or network is involved.
test.describe('AI features (stubbed model)', () => {
  test('the tutor is clearly labeled as AI and replies', async ({ page }) => {
    await page.goto('/app/practice/session?mode=practice&concept=frac_operations&difficulty=medium');
    await answer(page, 'wrong');
    await page.getByRole('button', { name: 'Work through it with the tutor' }).click();
    const tutor = page.getByRole('dialog', { name: 'AI tutor' });
    await expect(tutor.getByText('Replies are AI-generated')).toBeVisible();
    await expect(tutor.getByRole('textbox', { name: 'Message the tutor' })).toBeFocused();
    await tutor.getByRole('textbox', { name: 'Message the tutor' }).fill('I added the tops and the bottoms.');
    await tutor.getByRole('button', { name: 'Send message' }).click();
    await expect(tutor.getByText(TUTOR_REPLY)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tutor).toBeHidden();
    await expect(page.getByRole('button', { name: 'Work through it with the tutor' })).toBeFocused();
  });

  test('explanations are labeled as AI and stay labeled when saved to notes', async ({ page }) => {
    await page.goto('/app/topics/frac_equiv');
    await page.getByRole('button', { name: 'Explain', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Where it goes wrong' })).toBeVisible();
    await expect(page.getByText('AI-generated', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save to notes' }).click();
    await page.getByRole('tab', { name: /Notes/ }).click();
    await expect(page.getByText('From an AI explanation')).toBeVisible();
  });

  test('generated questions are validated before they enter the bank', async ({ page }) => {
    await page.goto('/app/topics/frac_equiv');
    await page.getByRole('tab', { name: /Questions/ }).click();
    await page.getByRole('button', { name: 'Generate with AI' }).click();
    const dialog = page.getByRole('dialog', { name: /Generate questions/ });
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect(dialog.getByText('Which fraction is equivalent to 2/3?')).toBeVisible();
    // The stub's second question duplicates a curated one, so it cannot be selected.
    await expect(dialog.getByText("Can't be added: This topic already has a question with the same wording.")).toBeVisible();
    await expect(dialog.getByRole('checkbox').nth(1)).toBeDisabled();
    await dialog.getByRole('button', { name: 'Add 1 question' }).click();
    await expect(page.getByText('1 question added')).toBeVisible();

    await page.goto('/app/questions');
    await page.getByRole('radio', { name: 'AI-generated' }).click();
    const row = page.getByRole('listitem').filter({ hasText: 'Which fraction is equivalent to 2/3?' });
    await expect(row.getByText('AI-generated')).toBeVisible();
    await row.getByRole('button', { name: 'Show options' }).click();
    // A distractor whose misconception already exists reuses it instead of creating a duplicate.
    await expect(row.getByText('catches Additive Scaling')).toBeVisible();
  });

});

test.describe('offline mode', () => {
  // Aborted API requests are logged by the browser; that is the point of this test.
  test.use({ allowedConsoleErrors: [/net::ERR_FAILED/] });

  test('without the API the app falls back to bundled content and built-in hints', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort());
    await page.goto('/app/settings');
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByText('Not configured')).toBeVisible();

    await page.goto('/app/practice/session?mode=practice&concept=frac_operations&difficulty=medium');
    await answer(page, 'wrong');
    await page.getByRole('button', { name: 'Work through it with the tutor' }).click();
    const tutor = page.getByRole('dialog', { name: 'Guided hints' });
    await expect(tutor.getByText('Built-in hints, no AI')).toBeVisible();
    await tutor.getByRole('textbox', { name: 'Message the tutor' }).fill('I am not sure.');
    await tutor.getByRole('button', { name: 'Send message' }).click();
    await expect(tutor.getByText(/Here is a nudge|strategy that helps/)).toBeVisible();

    await page.goto('/app/topics/frac_equiv');
    await expect(page.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
  });
});
