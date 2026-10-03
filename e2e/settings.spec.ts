import fs from 'node:fs';
import { answer } from './support/app';
import { expect, test } from './support/fixtures';

test.describe('settings and data', () => {
  test('exports, rejects invalid imports, and restores an export', async ({ page }, testInfo) => {
    await page.goto('/app/practice/session?mode=practice&concept=frac_visual&count=3');
    await answer(page, 'correct');
    await expect(page.getByText('Correct', { exact: true })).toBeVisible();

    await page.goto('/app/settings');
    await expect(page).toHaveTitle('Settings · GapLearning');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()]);
    const exportPath = testInfo.outputPath('export.json');
    await download.saveAs(exportPath);
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    expect(exported).toMatchObject({ version: 1 });
    expect(exported.attempts).toHaveLength(1);

    const badPath = testInfo.outputPath('bad.json');
    fs.writeFileSync(badPath, '{"hello": 1}');
    await page.getByLabel('Choose an export file').setInputFiles(badPath);
    await expect(page.getByText('Could not import that file')).toBeVisible();

    await page.getByRole('button', { name: 'Delete everything' }).click();
    await page.getByRole('dialog', { name: 'Delete all data?' }).getByRole('button', { name: 'Delete everything' }).click();
    await expect(page.getByText('All data deleted')).toBeVisible();

    await page.getByLabel('Choose an export file').setInputFiles(exportPath);
    await page.getByRole('dialog', { name: 'Replace your workspace?' }).getByRole('button', { name: 'Import and replace' }).click();
    await expect(page.getByText('Workspace imported')).toBeVisible();
    await page.goto('/app/topics/frac_visual');
    await expect(page.getByText(/100% correct · last practiced/)).toBeVisible();
  });

  test('the theme choice applies immediately and persists', async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByRole('radiogroup', { name: 'Theme', exact: true }).getByRole('radio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('radiogroup', { name: 'Theme', exact: true }).getByRole('radio', { name: 'Light' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
