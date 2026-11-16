import { expect, test } from '@playwright/test';

test('błędny plik XER pokazuje komunikat, a puste ekrany mają stany puste', async ({ page }) => {
  await page.goto('./#/import');
  await expect(page.getByText(/Bieżący: Rev0G/)).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Plik importu').setInputFiles({ name: 'zly.xer', mimeType: 'text/plain', buffer: Buffer.from('to nie jest XER') });
  await expect(page.getByRole('alert')).toContainText('ERMHDR');
  await page.getByRole('link', { name: 'Monity', exact: true }).click();
  await expect(page.getByText('Brak monitów')).toBeVisible();
  await page.getByRole('link', { name: 'Rejestr' }).click();
  await expect(page.getByText('Rejestr jest pusty')).toBeVisible();
});
