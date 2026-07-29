import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectSingleH1, gotoStable } from './helpers';

test.describe('compare colleges', () => {
    test('page renders with either an empty state or a comparison table', async ({ page }) => {
        const response = await gotoStable(page, '/compare-colleges');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.locator('main')).toBeVisible();

        // The comparison streams in behind a Suspense boundary, so poll rather than
        // reading `main` once and catching the skeleton.
        await expect
            .poll(async () => {
                if ((await page.locator('main table').count()) > 0) return 'table';
                const text = (await page.locator('main').innerText()).toLowerCase();
                return /add|select|choose|compare|no college/.test(text) ? 'empty-state' : text;
            })
            .toMatch(/^(table|empty-state)$/);

        if ((await page.locator('main table').count()) > 0) {
            await expect(page.locator('main table').first()).toBeVisible();
        }

        expect((await page.locator('main').innerText()).toLowerCase()).not.toContain('application error');
    });

    test('preselected slugs in the URL do not break the page', async ({ page }) => {
        await gotoStable(page, '/compare-colleges?slugs=not-a-real-college,another-fake-college');

        await expect(page.locator('main')).toBeVisible();
        const body = (await page.locator('main').innerText()).toLowerCase();
        expect(body).not.toContain('application error');
    });

    test('layout survives a narrow viewport', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 900 });
        await gotoStable(page, '/compare-colleges');
        await page.waitForTimeout(300);
        await expectNoHorizontalOverflow(page, '/compare-colleges @ 360px');
    });
});
