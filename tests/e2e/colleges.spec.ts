import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectSingleH1, gotoStable } from './helpers';

const CARD_LINK = 'main a[href^="/colleges/"]';

test.describe('college listing', () => {
    test('listing page renders', async ({ page }) => {
        const response = await gotoStable(page, '/colleges');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.locator('main')).toBeVisible();
        await expectNoHorizontalOverflow(page, '/colleges');
    });

    test('filter applied through a URL param keeps the page healthy', async ({ page }) => {
        await gotoStable(page, '/colleges?page=1&sort=popular');
        await expect(page.locator('main')).toBeVisible();
        await expectSingleH1(page);

        const body = (await page.locator('main').innerText()).toLowerCase();
        expect(body).not.toContain('application error');
    });

    test('an unmatched filter shows an empty state rather than an error', async ({ page }) => {
        await gotoStable(page, '/colleges?q=zzzznotarealcollegezzzz');
        await expect(page.locator('main')).toBeVisible();
        const body = (await page.locator('main').innerText()).toLowerCase();
        expect(body).not.toContain('application error');
    });

    test('a college detail page opens when the dataset has cards', async ({ page }) => {
        await gotoStable(page, '/colleges');

        const cards = page.locator(CARD_LINK);
        const count = await cards.count();
        test.skip(count === 0, 'No college cards rendered — seed data is not loaded.');

        const href = await cards.first().getAttribute('href');
        await cards.first().click();
        await page.waitForURL(/\/colleges\/[^/?]+/, { timeout: 20_000 });

        await expectSingleH1(page);
        await expect(page.locator('main')).toBeVisible();
        expect(page.url()).toContain(href ?? '/colleges/');
        await expectNoHorizontalOverflow(page, 'college detail');
    });

    test('detail tabs (courses, fees, cutoff, reviews) resolve when a college exists', async ({ page }) => {
        await gotoStable(page, '/colleges');
        const cards = page.locator(CARD_LINK);
        test.skip((await cards.count()) === 0, 'No college cards rendered — seed data is not loaded.');

        const href = await cards.first().getAttribute('href');
        const slugPath = (href ?? '').split('?')[0]?.replace(/\/$/, '') ?? '';
        test.skip(!slugPath.startsWith('/colleges/'), 'Unexpected card href.');

        for (const tab of ['courses', 'fees', 'cutoff', 'reviews']) {
            const response = await gotoStable(page, `${slugPath}/${tab}`);
            expect(response?.status() ?? 200, `${slugPath}/${tab}`).toBeLessThan(500);
            await expect(page.locator('main')).toBeVisible();
        }
    });
});
