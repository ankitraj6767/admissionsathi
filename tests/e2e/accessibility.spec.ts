import { expect, test } from '@playwright/test';
import { expectSingleH1, gotoStable } from './helpers';

const PAGES = ['/', '/colleges', '/courses', '/exams'];

test.describe('accessibility basics', () => {
    for (const path of PAGES) {
        test.describe(`page ${path}`, () => {
            test('has a skip-to-content link that targets an existing element', async ({ page }) => {
                await gotoStable(page, path);

                const skipLink = page.locator('a[href^="#"]').filter({ hasText: /skip/i }).first();
                await expect(skipLink).toBeAttached();

                const href = await skipLink.getAttribute('href');
                expect(href).toBeTruthy();
                await expect(page.locator(href!)).toBeAttached();
            });

            test('exactly one h1 and no skipped heading levels at the top', async ({ page }) => {
                await gotoStable(page, path);
                await expectSingleH1(page);
                expect(await page.locator('h1').first().innerText()).not.toBe('');
            });

            test('every image has an alt attribute', async ({ page }) => {
                await gotoStable(page, path);

                const missing = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('img'))
                        .filter((img) => !img.hasAttribute('alt'))
                        .map((img) => img.getAttribute('src') ?? '(no src)'),
                );

                expect(missing, `images without alt: ${missing.join(', ')}`).toEqual([]);
            });

            test('every form control has an accessible name', async ({ page }) => {
                await gotoStable(page, path);

                const unnamed = await page.evaluate(() => {
                    const controls = Array.from(
                        document.querySelectorAll<HTMLElement>('input, select, textarea'),
                    ).filter((el) => {
                        const type = el.getAttribute('type');
                        return type !== 'hidden' && !el.hasAttribute('aria-hidden');
                    });

                    return controls
                        .filter((el) => {
                            if (el.getAttribute('aria-label')?.trim()) return false;
                            if (el.getAttribute('title')?.trim()) return false;
                            const labelledBy = el.getAttribute('aria-labelledby');
                            if (labelledBy && labelledBy.split(/\s+/).some((id) => document.getElementById(id)))
                                return false;
                            if (el.id && document.querySelector(`label[for="${el.id}"]`)) return false;
                            if (el.closest('label')) return false;
                            if (el.getAttribute('placeholder')?.trim()) return false;
                            return true;
                        })
                        .map((el) => `${el.tagName.toLowerCase()}#${el.id || '(no id)'}`);
                });

                expect(unnamed, `controls without an accessible name: ${unnamed.join(', ')}`).toEqual([]);
            });

            test('keyboard focus is visible and reaches an interactive element', async ({ page }) => {
                await gotoStable(page, path);
                await page.keyboard.press('Tab');

                const focus = await page.evaluate(() => {
                    const el = document.activeElement as HTMLElement | null;
                    if (!el || el === document.body) return null;
                    const style = getComputedStyle(el);
                    return {
                        tag: el.tagName.toLowerCase(),
                        outlineWidth: style.outlineWidth,
                        outlineStyle: style.outlineStyle,
                        boxShadow: style.boxShadow,
                        ring: style.getPropertyValue('--tw-ring-shadow'),
                    };
                });

                expect(focus, 'Tab did not move focus to an interactive element').not.toBeNull();
                expect(['a', 'button', 'input', 'select', 'textarea', 'summary']).toContain(focus!.tag);

                const hasVisibleFocus =
                    (focus!.outlineStyle !== 'none' && focus!.outlineWidth !== '0px') ||
                    (focus!.boxShadow !== 'none' && focus!.boxShadow !== '') ||
                    (focus!.ring !== '' && focus!.ring !== '0 0 #0000');
                expect(hasVisibleFocus, `no visible focus indicator on <${focus!.tag}>`).toBe(true);
            });

            test('has a main landmark and a document language', async ({ page }) => {
                await gotoStable(page, path);
                await expect(page.locator('main')).toHaveCount(1);
                expect(await page.locator('html').getAttribute('lang')).toBeTruthy();
            });
        });
    }
});
