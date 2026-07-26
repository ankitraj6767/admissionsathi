import { expect, test } from '@playwright/test';
import {
    BREAKPOINTS,
    DESKTOP_NAV_MIN_WIDTH,
    expectNoHorizontalOverflow,
    gotoStable,
} from './helpers';

const PAGES = ['/', '/colleges', '/book-counselling'];

// One browser project is enough — the viewport is what matters here.
test.describe.configure({ mode: 'parallel' });

test.describe('responsive layout', () => {
    for (const width of BREAKPOINTS) {
        test.describe(`${width}px`, () => {
            test('no horizontal overflow on key pages', async ({ page }) => {
                await page.setViewportSize({ width, height: 900 });

                for (const path of PAGES) {
                    await gotoStable(page, path);
                    await page.waitForTimeout(250);
                    await expectNoHorizontalOverflow(page, `${path} @ ${width}px`);
                }
            });

            test('the header shows the right navigation for the width', async ({ page }) => {
                await page.setViewportSize({ width, height: 900 });
                await gotoStable(page, '/');

                const desktopNav = page.getByRole('navigation', { name: /primary/i });
                const menuButton = page.getByRole('button', { name: /open menu/i });

                if (width >= DESKTOP_NAV_MIN_WIDTH) {
                    await expect(desktopNav).toBeVisible();
                    await expect(menuButton).toBeHidden();
                } else {
                    await expect(menuButton).toBeVisible();
                    await expect(desktopNav).toBeHidden();
                }
            });

            test('tap targets in the header are at least 40px tall', async ({ page }) => {
                test.skip(width >= DESKTOP_NAV_MIN_WIDTH, 'Touch target rule checked on small screens.');

                await page.setViewportSize({ width, height: 900 });
                await gotoStable(page, '/');

                const box = await page.getByRole('button', { name: /open menu/i }).boundingBox();
                expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
                expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
            });
        });
    }

    test('the mobile drawer opens and closes', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await gotoStable(page, '/');

        await page.getByRole('button', { name: /open menu/i }).click();
        const drawer = page.getByRole('navigation', { name: /mobile/i });
        await expect(drawer).toBeVisible();

        await page.getByRole('button', { name: /close menu/i }).first().click();
        await expect(drawer).toBeHidden();
    });

    test('content stays readable when the viewport is very short', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 480 });
        await gotoStable(page, '/');
        await expectNoHorizontalOverflow(page, 'home @ 360x480');
        await expect(page.locator('main')).toBeVisible();
    });

    test('the public header remains pinned and the desktop counselling CTA stays in bounds', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoStable(page, '/');

        const header = page.locator('header').first();
        const cta = header.getByRole('link', { name: 'Book Free Counselling', exact: true });

        await expect(header).toBeVisible();
        await expect(cta).toBeVisible();

        const ctaBox = await cta.boundingBox();
        expect(ctaBox).not.toBeNull();
        expect((ctaBox?.x ?? 0) + (ctaBox?.width ?? 0)).toBeLessThanOrEqual(1440);

        await page.evaluate(() => window.scrollTo(0, 900));
        await expect.poll(async () => (await header.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    });
});
