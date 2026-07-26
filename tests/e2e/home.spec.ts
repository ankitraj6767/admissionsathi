import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectSingleH1, gotoStable } from './helpers';

test.describe('homepage', () => {
    test('loads with a single h1 and the primary landmarks', async ({ page }) => {
        const response = await gotoStable(page, '/');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.locator('header').first()).toBeVisible();
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('footer').first()).toBeAttached();
        await expect(page).toHaveTitle(/.+/);
    });

    test('header navigation is reachable', async ({ page }) => {
        await gotoStable(page, '/');

        const desktopNav = page.getByRole('navigation', { name: /primary/i });
        const menuButton = page.getByRole('button', { name: /open menu/i });

        // Exactly one of the two navigation affordances is visible at any width.
        const desktopVisible = await desktopNav.isVisible().catch(() => false);
        const mobileVisible = await menuButton.isVisible().catch(() => false);
        expect(desktopVisible || mobileVisible).toBe(true);

        if (mobileVisible) {
            await menuButton.click();
            await expect(page.getByRole('navigation', { name: /mobile/i })).toBeVisible();
            await page.getByRole('button', { name: /close menu/i }).first().click();
        }
    });

    test('sticky counselling CTA is present', async ({ page }) => {
        await gotoStable(page, '/');

        const stickyCta = page.getByRole('region', { name: /counselling call to action/i });
        // Rendered on mount, translated into view after scrolling past the hero.
        await expect(stickyCta).toBeAttached();

        await page.mouse.wheel(0, 900);
        await expect(stickyCta).toBeVisible();
    });

    test('hero exposes the search entry point', async ({ page }) => {
        await gotoStable(page, '/');
        await expect(page.getByRole('combobox').first()).toBeVisible();
    });

    for (const width of [360, 390, 768, 1280]) {
        test(`no horizontal overflow at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await gotoStable(page, '/');
            await page.waitForTimeout(300);
            await expectNoHorizontalOverflow(page, `home @ ${width}px`);
        });
    }
});
