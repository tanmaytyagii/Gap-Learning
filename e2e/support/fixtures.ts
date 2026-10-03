import { test as base, expect } from '@playwright/test';

interface Fixtures {
  /** Console messages matching these patterns are expected in this test (e.g. aborted requests). */
  allowedConsoleErrors: RegExp[];
  consoleErrors: string[];
}

/** Every test fails if the page logs a console error or throws, unless explicitly allowed. */
export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [async ({ page, allowedConsoleErrors }, use) => {
    const errors: string[] = [];
    const record = (message: string) => {
      if (!allowedConsoleErrors.some((pattern) => pattern.test(message))) errors.push(message);
    };
    page.on('console', (message) => { if (message.type() === 'error') record(message.text()); });
    page.on('pageerror', (error) => record(error.message));
    await use(errors);
    expect(errors, 'browser console errors').toEqual([]);
  }, { auto: true }],
});

export { expect };
