import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectSingleH1, gotoStable } from './helpers';

test.describe('book counselling', () => {
    test('form renders with name and mobile fields', async ({ page }) => {
        const response = await gotoStable(page, '/book-counselling');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.getByLabel(/your name|full name/i).first()).toBeVisible();
        await expect(page.getByLabel(/mobile/i).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /book|submit|confirm|request/i }).first()).toBeVisible();
    });

    test('submitting an empty form surfaces validation errors', async ({ page }) => {
        await gotoStable(page, '/book-counselling');

        const submit = page.getByRole('button', { name: /book|submit|confirm|request/i }).first();
        await submit.click();

        // Client validation (react-hook-form + zod) renders inline messages.
        const alerts = page.locator('[role="alert"], [data-error], .text-red, .text-danger');
        const alertCount = await alerts
            .first()
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => alerts.count())
            .catch(() => 0);

        if (alertCount === 0) {
            // Fallback: the browser's own constraint validation must block submission.
            const invalid = await page.locator('main :invalid').count();
            expect(invalid, 'expected either inline errors or native invalid fields').toBeGreaterThan(0);
        } else {
            expect(alertCount).toBeGreaterThan(0);
            const text = (await page.locator('main').innerText()).toLowerCase();
            expect(text).toMatch(/enter|required|choose|accept|select/);
        }

        // The page must not have navigated away.
        expect(new URL(page.url()).pathname).toContain('/book-counselling');
    });

    test('an invalid mobile number is rejected', async ({ page }) => {
        await gotoStable(page, '/book-counselling');

        await page.getByLabel(/your name|full name/i).first().fill('Test Student');
        await page.getByLabel(/mobile/i).first().fill('12345');
        await page.getByRole('button', { name: /book|submit|confirm|request/i }).first().click();

        const text = await page
            .locator('main')
            .innerText()
            .then((t) => t.toLowerCase());
        expect(text).toMatch(/mobile|phone|valid/);
        expect(new URL(page.url()).pathname).toContain('/book-counselling');
    });

    test('layout holds at 360px', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 900 });
        await gotoStable(page, '/book-counselling');
        await page.waitForTimeout(300);
        await expectNoHorizontalOverflow(page, '/book-counselling @ 360px');
    });
});
