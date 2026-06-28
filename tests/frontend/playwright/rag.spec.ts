import { test, expect } from '@playwright/test';

test('rag page renders cited answer', async ({ page }) => {
  await page.goto('/rag');

  await page.getByRole('textbox').fill('How do I prep ginger for stir-fry?');
  await page.getByRole('button', { name: /ask ai/i }).click();

  await expect(page.getByTestId('rag-answer')).toBeVisible();
  await expect(page.getByTestId('citation-marker').first()).toBeVisible();
  await expect(page.getByText(/Confidence/i)).toBeVisible();
});