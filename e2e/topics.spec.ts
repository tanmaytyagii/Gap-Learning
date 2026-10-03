import { expect, test } from './support/fixtures';

test.describe('topics', () => {
  test('navigate from the list to a topic and between its sections', async ({ page }) => {
    await page.goto('/app/topics');
    await expect(page.getByRole('heading', { name: 'Mathematics' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search topics and notes' }).fill('perfect');
    await expect(page.getByRole('link', { name: 'Present Perfect vs. Past' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Basic Fractions' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Present Perfect vs. Past' }).click();

    await expect(page).toHaveTitle('Present Perfect vs. Past · GapLearning');
    await expect(page.getByRole('heading', { name: 'Lesson' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Past Tense Contrast' })).toBeVisible();
    await page.getByRole('tab', { name: /Questions/ }).click();
    await expect(page.getByRole('tabpanel', { name: 'Questions' }).getByText('6 questions')).toBeVisible();
  });

  test('a manual status holds until the next answer and says so', async ({ page }) => {
    await page.goto('/app/topics/frac_compare');
    await page.getByRole('combobox', { name: 'Status' }).selectOption('learning');
    await expect(page.getByText('This holds until your next answer on the topic')).toBeVisible();
    await expect(page.getByTitle('Set manually').first()).toBeVisible();
  });

  test('notes are saved, searchable, editable, and deleted only after confirmation', async ({ page }) => {
    await page.goto('/app/topics/frac_equiv');
    await page.getByRole('tab', { name: /Notes/ }).click();
    await page.getByLabel('New note').fill('Scale factor first: new ÷ old. **Never add.**');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('Note saved')).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Never add.' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit note' }).click();
    await page.getByLabel('Edit note').fill('Scale factor first, then multiply both terms.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Note updated')).toBeVisible();

    await page.goto('/app/topics');
    await page.getByRole('searchbox', { name: 'Search topics and notes' }).fill('multiply both terms');
    await expect(page.getByText('matched in your notes')).toBeVisible();

    await page.goto('/app/topics/frac_equiv');
    await page.getByRole('tab', { name: /Notes/ }).click();
    await page.getByRole('button', { name: 'Delete note' }).click();
    await page.getByRole('dialog', { name: 'Delete this note?' }).getByRole('button', { name: 'Delete note' }).click();
    await expect(page.getByText('No notes yet')).toBeVisible();
  });

  test('resources accept only web links', async ({ page }) => {
    await page.goto('/app/topics/frac_visual');
    await page.getByRole('tab', { name: /Resources/ }).click();
    await page.getByLabel('Title').fill('Fractions course');
    await page.getByLabel('Link').fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Add resource' }).click();
    await expect(page.getByText('Enter a valid http or https link.')).toBeVisible();
    await page.getByLabel('Link').fill('www.khanacademy.org/math/arithmetic');
    await page.getByRole('button', { name: 'Add resource' }).click();
    await expect(page.getByText('Resource added')).toBeVisible();
    const link = page.getByRole('link', { name: /Fractions course/ });
    await expect(link).toHaveAttribute('href', 'https://www.khanacademy.org/math/arithmetic');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('custom topics can be created, edited, and deleted with their empty subject', async ({ page }) => {
    await page.goto('/app/topics');
    await page.getByRole('button', { name: 'Add topic' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a topic' });
    await dialog.getByRole('button', { name: 'Add topic' }).click();
    await expect(dialog.getByText('Give the topic a name.')).toBeVisible();
    await dialog.getByLabel('Subject').selectOption({ label: 'New subject…' });
    await dialog.getByLabel('New subject name').fill('Web development');
    await dialog.getByLabel('Topic name').fill('React hooks');
    await dialog.getByRole('button', { name: 'Add topic' }).click();
    await expect(page).toHaveURL(/\/app\/topics\/topic-react-hooks-/);
    await expect(page.getByRole('heading', { name: 'React hooks', level: 1 })).toBeVisible();
    await expect(page.getByText('Custom topic')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: /Delete “React hooks”/ }).getByRole('button', { name: 'Delete topic' }).click();
    await expect(page).toHaveURL(/\/app\/topics$/);
    await expect(page.getByRole('link', { name: 'React hooks' })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Web development' })).toHaveCount(0);
  });
});
