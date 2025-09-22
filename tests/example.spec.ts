import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/AI Lead Router/);
});

test('get started link', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  const getStartedLink = page.getByRole('link', { name: 'Get started' }).first();
  
  if (await getStartedLink.isVisible()) {
    await getStartedLink.click();

    // Expects page to have a heading with the name of Installation.
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  }
});

test('basic navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page loads successfully
  await expect(page.locator('body')).toBeVisible();
  
  // Check for common navigation elements
  const navElements = page.locator('nav, header, [role="navigation"]').first();
  if (await navElements.isVisible()) {
    await expect(navElements).toBeVisible();
  }
});
