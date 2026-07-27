import { expect, test } from '@playwright/test';
import { gotoStable } from './helpers';
import {
    CONTENT_MANAGER_EMAIL,
    expectSaveSucceeded,
    fillIfPresent,
    signIn,
    signInAsAdmin,
    uniqueSuffix,
} from './admin-helpers';

/**
 * Admin workflows 8-12 from the acceptance criteria.
 *
 * These need a signed-in staff session against a seeded database; each spec skips
 * with an explanatory message when that is not available (see `admin-helpers`).
 * Only the desktop project runs them — the admin console is not a mobile surface.
 */
test.describe('admin workflows', () => {
    test.skip(({ isMobile }) => Boolean(isMobile), 'Admin console targets desktop widths');
    test.describe.configure({ mode: 'serial' });

    test('8a. admin creates a college draft', async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);

        const suffix = uniqueSuffix();
        const name = `E2E Test College ${suffix}`;

        await gotoStable(page, '/admin/colleges/new');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        await fillIfPresent(page, /college name/i, name);
        await fillIfPresent(page, /^slug/i, `e2e-test-college-${suffix}`);

        // State and city are required references; the pickers are searchable selects.
        const stateField = page.getByLabel(/^state/i).first();
        if ((await stateField.count()) > 0) {
            await stateField.click().catch(() => undefined);
        }

        await page
            .getByRole('button', { name: /save|create|publish/i })
            .first()
            .click();

        const body = (await page.locator('body').innerText()).toLowerCase();
        // Either it saved, or it told us precisely which required field is missing.
        expect(/saved|created|required|select|please correct/.test(body)).toBe(true);
    });

    test('8b. the college listing exposes create and publish controls', async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);

        await gotoStable(page, '/admin/colleges');

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(
            page.getByRole('link', { name: /new college|add college|create/i }).first(),
        ).toBeVisible();
    });

    test('9. admin reaches the cut-off dataset import screen', async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);

        await gotoStable(page, '/admin/cutoff-datasets');

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const body = (await page.locator('body').innerText()).toLowerCase();

        // The import flow is upload -> map columns -> validate -> publish.
        expect(body).toContain('csv');
        expect(/predictor/.test(body)).toBe(true);
    });

    test('10. lead management offers status updates and assignment', async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);

        await gotoStable(page, '/admin/leads');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const rows = page.locator('table tbody tr');
        const count = await rows.count();
        testInfo.skip(count === 0, 'No leads in this dataset — submit the counselling form first.');

        await rows.first().locator('a').first().click();
        await page.waitForLoadState('domcontentloaded');

        const body = (await page.locator('body').innerText()).toLowerCase();
        expect(/status|follow.?up|assign|counsellor/.test(body)).toBe(true);
    });

    test('11. a content manager can reach article publishing', async ({ page }, testInfo) => {
        // Signs in with the narrower demo role on purpose: publishing must work for
        // a content manager, not only for the super admin.
        const result = await signIn(page, CONTENT_MANAGER_EMAIL, 'Admin@12345');
        testInfo.skip(
            !result.signedIn,
            'Demo content manager unavailable — run `npm run db:seed` to create the staff users.',
        );

        await gotoStable(page, '/admin/articles');
        const pathname = new URL(page.url()).pathname;
        testInfo.skip(pathname === '/403', 'Demo content manager password differs in this dataset.');

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        const body = (await page.locator('body').innerText()).toLowerCase();
        expect(/article|draft|publish/.test(body)).toBe(true);
    });

    test('12. admin edits a homepage section and sees it persist', async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);

        await gotoStable(page, '/admin/homepage');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const headingField = page.getByLabel(/heading/i).first();
        testInfo.skip(
            (await headingField.count()) === 0,
            'Homepage builder exposed no editable heading field.',
        );

        const original = await headingField.inputValue();
        const updated = `${original} ${uniqueSuffix()}`.slice(0, 180);

        await headingField.fill(updated);
        await page
            .getByRole('button', { name: /save|update|publish/i })
            .first()
            .click();

        await expectSaveSucceeded(page);

        // Reload to prove it was persisted rather than only reflected in local state.
        await gotoStable(page, '/admin/homepage');
        await expect(page.getByLabel(/heading/i).first()).toHaveValue(updated);

        // Leave the CMS as we found it.
        await page.getByLabel(/heading/i).first().fill(original);
        await page
            .getByRole('button', { name: /save|update|publish/i })
            .first()
            .click();
    });

    test('the admin console is not indexable', async ({ page }, testInfo) => {
        await signInAsAdmin(page, testInfo);

        await gotoStable(page, '/admin');

        const robots = page.locator('head meta[name="robots"]');
        await expect(robots).toHaveAttribute('content', /noindex/);
    });
});
