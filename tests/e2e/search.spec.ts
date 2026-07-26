import { expect, test } from '@playwright/test';
import { expectSingleH1, gotoStable } from './helpers';

test.describe('search', () => {
    test('typing in the hero search opens suggestions or submits to /search', async ({ page }) => {
        await gotoStable(page, '/');

        const input = page.getByRole('combobox').first();
        await input.click();
        await input.fill('engineering');

        const listbox = page.getByRole('listbox');
        const suggestionsAppeared = await listbox
            .first()
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false);

        if (suggestionsAppeared) {
            await expect(listbox.first()).toBeVisible();
            await expect(input).toHaveAttribute('aria-expanded', 'true');
        } else {
            test.info().annotations.push({
                type: 'note',
                description: 'No suggestion panel — dataset is likely empty, falling back to submit.',
            });
        }

        await input.press('Enter');
        await page.waitForURL(/\/search\?q=/, { timeout: 15_000 });
        expect(new URL(page.url()).searchParams.get('q')).toBe('engineering');
    });

    test('results page renders for a query', async ({ page }) => {
        await gotoStable(page, '/search?q=engineering');

        await expectSingleH1(page);
        await expect(page.locator('main')).toBeVisible();

        const body = await page.locator('main').innerText();
        // Either results or an explicit empty state — never a crash.
        expect(body.length).toBeGreaterThan(0);
        expect(body.toLowerCase()).not.toContain('application error');
    });

    test('results page tolerates a query with no matches', async ({ page }) => {
        await gotoStable(page, '/search?q=zzzznotarealcollegezzzz');

        await expect(page.locator('main')).toBeVisible();
        const body = (await page.locator('main').innerText()).toLowerCase();
        expect(body).toMatch(/no |not found|nothing|try|0 result|didn.t find/);
    });

    test('an empty query still renders the search page', async ({ page }) => {
        await gotoStable(page, '/search');
        await expect(page.locator('main')).toBeVisible();
        await expectSingleH1(page);
    });
});
