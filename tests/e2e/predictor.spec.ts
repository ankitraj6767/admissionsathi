import { expect, test } from '@playwright/test';
import { expectSingleH1, gotoStable } from './helpers';

test.describe('predictors', () => {
    test('listing page renders', async ({ page }) => {
        const response = await gotoStable(page, '/predictors');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.locator('main')).toBeVisible();
    });

    test('a predictor detail page exposes the form and the disclaimer', async ({ page }) => {
        await gotoStable(page, '/predictors');

        const links = page.locator('main a[href^="/predictors/"]');
        const count = await links.count();
        test.skip(count === 0, 'No predictors listed — seed data is not loaded.');

        await links.first().click();
        await page.waitForURL(/\/predictors\/[^/?]+/, { timeout: 20_000 });
        await expectSingleH1(page);

        // The run form: a numeric metric input plus a submit control.
        const numberInputs = page.locator('main input[type="number"], main input[inputmode="numeric"]');
        const selects = page.locator('main select, main [role="combobox"]');
        expect((await numberInputs.count()) + (await selects.count())).toBeGreaterThan(0);

        const submit = page.getByRole('button', { name: /predict|check|see|show|submit/i }).first();
        await expect(submit).toBeVisible();

        // Predictions are indicative — the disclaimer must always be readable.
        const body = (await page.locator('body').innerText()).toLowerCase();
        expect(body).toMatch(/disclaimer|indicative|not a guarantee|guidance only|estimate/);
    });

    test('an unknown predictor slug does not crash the app', async ({ page }) => {
        const response = await gotoStable(page, '/predictors/definitely-not-a-predictor');
        expect(response?.status() ?? 200).toBeLessThan(500);
        await expect(page.locator('body')).toBeVisible();
    });
});
