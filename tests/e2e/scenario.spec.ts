import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const expected: { owner: string; delta_wd: number }[] = JSON.parse(readFileSync('public/data/expected_shifts.json', 'utf8'));
const counts = new Map<string, number>();
for (const e of expected) if (e.delta_wd > 0) counts.set(e.owner, (counts.get(e.owner) ?? 0) + 1);
const topOwner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

test('scenariusz akceptacyjny z sekcji 10', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));

  // 1. baner, Rev0G, rola harmonogramista
  await page.goto('./');
  await expect(page.getByRole('note').first()).toContainText('Demo na danych syntetycznych — brak związku z rzeczywistym projektem');
  await expect(page.getByText(/harmonogram Rev0G/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel('Przełącznik roli')).toHaveValue('u-plan');

  // 2. import Rev0H
  await page.getByRole('link', { name: 'Import' }).click();
  await page.getByRole('button', { name: /Wybierz wbudowany Rev0H/ }).click();
  const shifts = page.getByTestId('shift-count');
  await expect(shifts).toContainText('Przesunięcia w zakresie: 218');
  await expect(page.getByTestId('added-count')).toContainText('0');
  await expect(page.getByTestId('removed-count')).toContainText('0');
  await page.getByRole('button', { name: 'Importuj' }).click();
  await expect(page.getByRole('status')).toContainText('Zaimportowano Rev0H');

  // 3. opiekun z największą liczbą monitów
  await page.getByLabel('Przełącznik roli').selectOption({ label: new RegExp(topOwner) as never }).catch(async () => {
    const opt = page.getByLabel('Przełącznik roli').locator('option', { hasText: topOwner });
    await page.getByLabel('Przełącznik roli').selectOption(await opt.getAttribute('value') as string);
  });
  await page.getByRole('link', { name: 'Monity', exact: true }).click();
  await page.locator('ul button').first().click();
  await page.getByRole('button', { name: 'Potwierdź kontakt z wykonawcą' }).click();
  await page.getByLabel('Nowy termin końca').fill('2028-03-31');
  await page.getByLabel('Powód').fill('Opóźniona dostawa materiałów');
  await page.getByRole('button', { name: 'Wyślij propozycję' }).click();
  await expect(page.getByText('Czeka na decyzję harmonogramisty')).toBeVisible();

  // 4. harmonogramista zatwierdza
  await page.getByLabel('Przełącznik roli').selectOption('u-plan');
  await page.getByRole('link', { name: 'Rejestr' }).click();
  await page.getByRole('button', { name: 'Zatwierdź' }).first().click();
  await expect(page.getByRole('cell', { name: 'zaakceptowano' })).toBeVisible();

  // 5. eksport delty
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Eksportuj deltę XER/ }).click()]);
  const path = await dl.path();
  const buf = readFileSync(path!);
  expect(buf.subarray(0, 6).toString('latin1')).toBe('ERMHDR');
  expect(buf.toString('latin1').split('\r\n').filter((l) => l.startsWith('%R')).length).toBe(1);
  expect(buf.toString('latin1')).toContain('CS_MSOA');
  expect(buf.toString('latin1').endsWith('%E\r\n')).toBe(true);

  // 6. odświeżenie zachowuje stan; reset przywraca początkowy
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByLabel('Przełącznik roli')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('link', { name: 'Rejestr' }).click();
  await expect(page.getByRole('cell', { name: 'zaakceptowano' })).toBeVisible();
  await page.getByRole('link', { name: 'Import' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Zresetuj demo' }).click();
  await expect(page.getByText(/Bieżący: Rev0G/)).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});
