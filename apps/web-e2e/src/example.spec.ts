import { expect, test } from '@playwright/test';

test('redirects an unauthenticated visitor to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});

test('signup form validates before submitting', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByText('Name is required', { exact: true }),
  ).toBeVisible();
});
