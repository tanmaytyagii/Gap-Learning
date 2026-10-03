import { card } from './support/app';
import { expect, test } from './support/fixtures';

test('goals are validated, track mastery, and are deleted after confirmation', async ({ page }) => {
  await page.goto('/app/goals');
  await page.getByRole('button', { name: 'Create a goal' }).click();
  const dialog = page.getByRole('dialog', { name: 'New goal' });
  await dialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(dialog.getByText('Name your goal.')).toBeVisible();
  await expect(dialog.getByText('Choose at least one topic.')).toBeVisible();

  await dialog.getByLabel('Goal').fill('Fractions by month end');
  await dialog.getByRole('button', { name: 'Select all' }).first().click();
  await dialog.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByText('Goal created')).toBeVisible();

  const goal = card(page, 'Fractions by month end');
  await expect(goal.getByText('0 of 4 topics mastered')).toBeVisible();
  await expect(goal.getByText('In progress')).toBeVisible();
  await expect(goal.getByRole('link', { name: /^Practice / })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Fractions by month end' }).click();
  await page.getByRole('dialog', { name: /Delete “Fractions by month end”/ }).getByRole('button', { name: 'Delete goal' }).click();
  await expect(page.getByText('No goals yet')).toBeVisible();
});
