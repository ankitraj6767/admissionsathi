import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, gotoStable } from './helpers';

/**
 * Regression guard for the mobile drawer outage.
 *
 * The drawer is declared inside the site header, which applies
 * `backdrop-blur-md`. A non-`none` `backdrop-filter` makes an element the
 * containing block for its fixed-position descendants, so `fixed inset-0`
 * resolved to the ~64px header box: the backdrop covered only the header strip
 * and the nav list was clipped to zero height. The drawer opened showing nothing
 * but the logo and the close button.
 *
 * These tests assert the panel really fills the viewport and that the top-level
 * sections expand, which is what the containing-block bug broke.
 */
test.describe('mobile navigation drawer', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await gotoStable(page, '/');
    });

    test('fills the viewport rather than being trapped inside the header', async ({ page }) => {
        await page.getByRole('button', { name: 'Open menu' }).click();

        const panel = page.getByRole('dialog', { name: 'Site menu' });
        await expect(panel).toBeVisible();

        const viewport = page.viewportSize()!;
        const box = await panel.boundingBox();
        expect(box).not.toBeNull();

        // The regression produced a panel only as tall as the header (~64px).
        expect(box!.height).toBeGreaterThan(viewport.height * 0.9);
        expect(box!.y).toBeLessThan(4);
    });

    test('renders the top-level nav items', async ({ page }) => {
        await page.getByRole('button', { name: 'Open menu' }).click();
        const panel = page.getByRole('dialog', { name: 'Site menu' });

        // Seeded/fallback header menu always contains these sections.
        for (const label of ['Courses', 'Colleges', 'Predictors', 'Exams']) {
            await expect(
                panel.getByRole('button', { name: label, exact: true }).or(
                    panel.getByRole('link', { name: label, exact: true }),
                ),
            ).toBeVisible();
        }
    });

    test('expands a section to reveal its child links', async ({ page }) => {
        await page.getByRole('button', { name: 'Open menu' }).click();
        const panel = page.getByRole('dialog', { name: 'Site menu' });

        const courses = panel.getByRole('button', { name: 'Courses', exact: true });
        await expect(courses).toHaveAttribute('aria-expanded', 'false');

        await courses.click();
        await expect(courses).toHaveAttribute('aria-expanded', 'true');

        // At least one child link must now be visible and clickable.
        const childLinks = panel.locator('ul ul a');
        expect(await childLinks.count()).toBeGreaterThan(0);
        await expect(childLinks.first()).toBeVisible();
    });

    test('closes on the close button and on Escape', async ({ page }) => {
        const open = page.getByRole('button', { name: 'Open menu' });
        const panel = page.getByRole('dialog', { name: 'Site menu' });

        await open.click();
        await expect(panel).toBeVisible();
        await panel.getByRole('button', { name: 'Close menu' }).click();
        await expect(panel).toBeHidden();

        await open.click();
        await expect(panel).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
    });

    test('does not introduce horizontal overflow while open', async ({ page }) => {
        await page.getByRole('button', { name: 'Open menu' }).click();
        await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeVisible();
        await expectNoHorizontalOverflow(page, 'drawer open @390');
    });
});

test.describe('header search dialog', () => {
    test('centres in the viewport instead of inside the header', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await gotoStable(page, '/');

        await page.getByRole('button', { name: 'Search', exact: true }).first().click();

        const dialog = page.getByRole('dialog', { name: 'Site search' });
        await expect(dialog).toBeVisible();

        const box = await dialog.boundingBox();
        // Same containing-block bug would have clamped this to the header strip.
        expect(box!.height).toBeGreaterThan(600);
    });
});
