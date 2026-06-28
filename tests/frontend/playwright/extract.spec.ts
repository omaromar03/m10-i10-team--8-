import { test, expect } from '@playwright/test';

test('extract page renders and returns entities', async ({ page }) => {
  await page.goto('/extract');

  await page.getByRole('textbox').fill(
    'Mince ginger and garlic before stir-frying tofu with soy sauce.'
  );

  await page.getByRole('button', { name: /extract entities/i }).click();

  await expect(page.getByTestId('entity-span').first()).toBeVisible();
  await expect(page.getByText(/ginger/i)).toBeVisible();
  await expect(page.getByText(/INGREDIENT/i)).toBeVisible();
});