import { test, expect } from '@playwright/test';

test('kg page renders and returns rows', async ({ page }) => {
  await page.goto('/kg');

  await page.getByRole('textbox').fill('Find recipes that use ginger');
  await page.getByRole('button', { name: /run graph query/i }).click();

  await expect(page.getByText(/Generated Cypher/i)).toBeVisible();
  await expect(page.getByTestId('kg-row').first()).toBeVisible();
});