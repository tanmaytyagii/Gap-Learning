import { expect, test } from './support/fixtures';

test.describe('keyboard and focus', () => {
  test('the skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/app');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('dialogs trap focus, close with Escape, and return focus to their trigger', async ({ page }) => {
    await page.goto('/app/topics');
    const trigger = page.getByRole('button', { name: 'Add topic' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Add a topic' });
    await expect(dialog).toBeVisible();
    // A native modal dialog makes the page behind it inert. Tab cycles through the dialog and may
    // briefly visit the browser's own UI (document.body is active then), but never page content.
    for (let index = 0; index < 14; index += 1) {
      await page.keyboard.press('Tab');
      const inside = await dialog.evaluate((element) => element.contains(document.activeElement) || document.activeElement === document.body);
      expect(inside).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('tabs and segmented controls follow arrow keys', async ({ page }) => {
    await page.goto('/app/topics/frac_visual');
    await page.getByRole('tab', { name: 'Overview' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Progress' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Questions/ })).toHaveAttribute('aria-selected', 'true');

    await page.goto('/app/topics');
    await page.getByRole('radio', { name: /^All/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: /^Not started/ })).toBeChecked();
  });
});
