import { expect, test } from '@playwright/test';
import { signInAsAdmin, uniqueSuffix } from './admin-helpers';
import { expectContainedHorizontalScroll, gotoStable } from './helpers';

/**
 * Admin lead CRM.
 *
 * Needs a seeded database and a signed-in staff session; `signInAsAdmin` skips the
 * spec when neither is available.
 */
test.describe('lead management', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);
    });

    test('the board shows every lifecycle stage as a column', async ({ page }) => {
        await gotoStable(page, '/admin/leads');

        await expect(page.getByRole('heading', { level: 1, name: /leads/i })).toBeVisible();

        for (const stage of ['New lead', 'Contacted', 'Qualified', 'Converted', 'Lost']) {
            await expect(
                page.getByRole('region', { name: stage }),
                `board should have a ${stage} column`,
            ).toHaveCount(1);
        }
    });

    test('the view toggle switches between board and table', async ({ page }) => {
        await gotoStable(page, '/admin/leads');

        // The toggle is a Client Component: a click before hydration is dropped, and
        // these are client-side navigations so `waitForURL`'s default `load` event
        // never fires. Retry the click until the URL reflects it — clicking the same
        // toggle twice is harmless.
        await expect(async () => {
            await page.getByRole('button', { name: /^table$/i }).click();
            await expect(page).toHaveURL(/view=table/, { timeout: 1_500 });
        }).toPass({ timeout: 20_000 });
        await expect(page.locator('table')).toBeVisible();

        await expect(async () => {
            await page.getByRole('button', { name: /^board$/i }).click();
            await expect(page).toHaveURL(/view=board/, { timeout: 1_500 });
        }).toPass({ timeout: 20_000 });
        await expect(page.getByRole('region', { name: 'New lead' })).toBeVisible();
    });

    test('filters are reflected in the URL so a view can be shared', async ({ page }) => {
        await gotoStable(page, '/admin/leads?view=table');

        // Below `lg` the filters sit behind a client-side disclosure. Rather than
        // branching on a `isVisible()` read that can race hydration, keep opening it
        // until the controls are actually reachable.
        const filtersToggle = page.getByRole('button', { name: /^filters/i });
        const stageFilter = page.getByLabel(/filter by stage/i);

        await expect(async () => {
            if (!(await stageFilter.isVisible())) {
                await filtersToggle.click({ timeout: 2_000 });
            }
            await expect(stageFilter).toBeVisible({ timeout: 1_000 });
        }).toPass({ timeout: 25_000 });

        await expect(async () => {
            await stageFilter.selectOption('new', { timeout: 2_000 });
            await expect(page).toHaveURL(/status=new/, { timeout: 1_500 });
        }).toPass({ timeout: 25_000 });

        await expect(async () => {
            await page.getByLabel(/filter by priority/i).selectOption('high', { timeout: 2_000 });
            await expect(page).toHaveURL(/priority=high/, { timeout: 1_500 });
        }).toPass({ timeout: 25_000 });
    });

    test('a lead created by hand appears with its own timeline', async ({ page }) => {
        const suffix = uniqueSuffix();
        const name = `E2E Lead ${suffix}`;

        await gotoStable(page, '/admin/leads/new');
        await page.getByRole('textbox', { name: 'Student name' }).fill(name);
        // Digits only, and unique per run so duplicate detection stays quiet.
        await page.getByRole('textbox', { name: 'Phone', exact: true }).fill(`9${String(Date.now()).slice(-9)}`);
        await page.getByRole('textbox', { name: 'Course interest' }).fill('B.Tech Computer Science');
        await page.getByRole('button', { name: /create lead/i }).click();

        await page.waitForURL(/\/admin\/leads\/[a-f0-9]{24}/, { timeout: 25_000 });
        await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
        await expect(page.getByText(/lead created manually/i)).toBeVisible();
    });

    test('a stage change is recorded on the timeline', async ({ page }) => {
        await gotoStable(page, '/admin/leads?view=table');

        const firstLead = page.locator('table tbody a[href^="/admin/leads/"]').first();
        if ((await firstLead.count()) === 0) {
            test.skip(true, 'No leads in the seeded dataset.');
        }
        await firstLead.click();
        await expect(page).toHaveURL(/\/admin\/leads\/[a-f0-9]{24}/);

        const stage = page.getByLabel(/^stage$/i);

        // The target stage is chosen inside the retry: an unchanged stage is a no-op by
        // design, so each attempt re-reads where the lead currently sits. That keeps
        // the retry meaningful whether the previous attempt was dropped before
        // hydration or already landed.
        await expect(async () => {
            const current = await stage.inputValue();
            const target = current === 'contacted' ? 'qualified' : 'contacted';

            await stage.selectOption(target);
            await page.getByLabel(/internal note/i).fill('Reached out over the phone.');
            await page.getByRole('button', { name: /save update/i }).click();

            await expect(
                page.getByText(new RegExp(`status moved to ${target}`, 'i')).first(),
            ).toBeVisible({ timeout: 4_000 });
        }).toPass({ timeout: 40_000 });
    });

    test('the board rail scrolls on a tablet without dragging the page sideways', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await gotoStable(page, '/admin/leads');

        await expectContainedHorizontalScroll(page, 'div.overflow-x-auto', '/admin/leads at 768px');
    });

    test('the table view also keeps its own overflow at 360px', async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await gotoStable(page, '/admin/leads?view=table');

        await expectContainedHorizontalScroll(page, 'div.overflow-x-auto', '/admin/leads table at 360px');
    });
});
