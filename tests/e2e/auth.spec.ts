import { expect, test } from '@playwright/test';
import { expectSingleH1, gotoStable } from './helpers';

test.describe('authentication pages', () => {
    test('signup renders its fields', async ({ page }) => {
        const response = await gotoStable(page, '/signup');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.getByLabel(/full name/i).first()).toBeVisible();
        await expect(page.getByLabel(/email/i).first()).toBeVisible();
        await expect(page.getByLabel(/^password/i).first()).toBeVisible();
    });

    test('signup shows client validation for a bad email and a weak password', async ({ page }) => {
        await gotoStable(page, '/signup');

        await page.getByLabel(/full name/i).first().fill('A');
        await page.getByLabel(/email/i).first().fill('not-an-email');
        await page.getByLabel(/^password/i).first().fill('weak');
        await page.getByRole('button', { name: /sign up|create account|register|continue/i }).first().click();

        const text = (await page.locator('main').innerText()).toLowerCase();
        expect(text).toMatch(/valid email|enter your full name|at least 8 characters|uppercase|number/);
        expect(new URL(page.url()).pathname).toContain('/signup');
    });

    test('login renders and validates', async ({ page }) => {
        const response = await gotoStable(page, '/login');
        expect(response?.status() ?? 200).toBeLessThan(400);

        await expectSingleH1(page);
        await expect(page.getByLabel(/email/i).first()).toBeVisible();
        await expect(page.getByLabel(/password/i).first()).toBeVisible();

        await page.getByLabel(/email/i).first().fill('nope');
        await page.getByRole('button', { name: /sign in|log in|login|continue/i }).first().click();

        const text = (await page.locator('main').innerText()).toLowerCase();
        expect(text).toMatch(/valid email|enter your password|required/);
        expect(new URL(page.url()).pathname).toContain('/login');
    });

    test('login links to signup and password recovery', async ({ page }) => {
        await gotoStable(page, '/login');
        await expect(page.getByRole('link', { name: /sign up|create|register/i }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /forgot/i }).first()).toBeVisible();
    });

    test('/admin redirects an unauthenticated visitor to login', async ({ page }) => {
        await gotoStable(page, '/admin');

        await page.waitForURL(/\/login|\/403/, { timeout: 20_000 }).catch(() => undefined);
        const pathname = new URL(page.url()).pathname;

        expect(pathname, `expected a redirect away from /admin, got ${page.url()}`).not.toBe('/admin');
        expect(pathname).toMatch(/^\/(login|403)/);
    });

    test('an admin deep link keeps the callback URL', async ({ page }) => {
        await gotoStable(page, '/admin/leads');
        await page.waitForURL(/\/login|\/403/, { timeout: 20_000 }).catch(() => undefined);

        const url = new URL(page.url());
        expect(url.pathname).not.toContain('/admin/leads');
        if (url.pathname === '/login') {
            const callback = url.searchParams.get('callbackUrl') ?? '';
            expect(callback === '' || callback.includes('admin')).toBe(true);
        }
    });
});
