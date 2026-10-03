import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('créer une mission affiche le net, la chronologie et les rappels', async ({ page }) => {
  await page.locator('[data-onglet="missions"]').click();
  await page.getByTestId('nouvelle-mission').click();
  await page.getByPlaceholder('Entreprise utilisatrice').fill('Chaudronnerie Test');
  await page.getByPlaceholder('Adresse du poste').fill('Bayonne');
  await page.locator('input[type="date"]').first().fill('2026-11-02');
  await page.locator('input[type="date"]').nth(1).fill('2026-11-13');
  await expect(page.getByTestId('apercu-mission')).toContainText('10 jours');
  await expect(page.getByTestId('apercu-mission')).toContainText('Net estimé');
  await page.getByRole('button', { name: 'Enregistrer la mission' }).click();
  await expect(page.locator('article', { hasText: 'Chaudronnerie Test' })).toBeVisible();

  // Agenda : le lundi 2 novembre 2026
  await page.locator('[data-onglet="agenda"]').click();
  for (let i = 0; i < 24; i++) {
    if (await page.locator('[data-date="2026-11-02"]:not(.hors)').count()) break;
    await page.getByLabel('Mois suivant').click();
  }
  await page.locator('[data-date="2026-11-02"]:not(.hors)').click();
  await expect(page.getByTestId('chronologie')).toContainText('Roues qui tournent');
  await expect(page.getByTestId('rappels')).toContainText('Tu dois partir maintenant');
  await expect(page.getByTestId('rappels')).toContainText('Va te coucher maintenant');
});

test('réserve : sélectionner des jours calcule le net avec la part non imposable', async ({ page }) => {
  await page.locator('[data-onglet="reserve"]').click();
  // 13 jours consécutifs du mois affiché
  const jours = page.locator('.jour:not(.hors)');
  for (let i = 0; i < 13; i++) await jours.nth(i).click();
  await expect(page.getByTestId('apercu-reserve')).toContainText('13 jours dont 13 hors base');
  await expect(page.getByTestId('apercu-reserve')).toContainText('1 102,40');
});

test('rendez-vous : ajout et chronologie de départ', async ({ page }) => {
  await page.getByRole('button', { name: /Rendez-vous/ }).click();
  await page.getByPlaceholder('Client, banque, agence…').fill('Client PC');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByTestId('jour-panel')).toContainText('Client PC');
  await expect(page.getByTestId('chronologie')).toBeVisible();
});

test('pas de défilement horizontal', async ({ page }) => {
  for (const id of ['agenda', 'missions', 'reserve', 'reglages']) {
    await page.locator(`[data-onglet="${id}"]`).click();
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(deborde, id).toBe(false);
  }
});
