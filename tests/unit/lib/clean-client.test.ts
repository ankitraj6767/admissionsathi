// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    cleanPastedHtml,
    normaliseEditorHtml,
    plainTextToHtml,
} from '@/lib/html/clean-client';

describe('cleanPastedHtml — Word and Google Docs paste', () => {
    it('unwraps styled spans but keeps the words', () => {
        const pasted =
            '<p class="MsoNormal"><span style="font-family:Calibri;color:#1F497D">Course overview</span></p>';

        expect(cleanPastedHtml(pasted)).toBe('<p>Course overview</p>');
    });

    it('drops font tags', () => {
        expect(cleanPastedHtml('<p><font face="Arial" size="3">Text</font></p>')).toBe('<p>Text</p>');
    });

    it('converts a div into a paragraph', () => {
        expect(cleanPastedHtml('<div>Body copy</div>')).toBe('<p>Body copy</p>');
    });

    it('normalises presentational tags to semantic ones', () => {
        expect(cleanPastedHtml('<p><b>bold</b> and <i>italic</i></p>')).toBe(
            '<p><strong>bold</strong> and <em>italic</em></p>',
        );
    });

    it('demotes an h1 so the page keeps one top-level heading', () => {
        expect(cleanPastedHtml('<h1>Overview</h1>')).toBe('<h2>Overview</h2>');
    });

    it('collapses h5 and h6 to the smallest supported heading', () => {
        expect(cleanPastedHtml('<h5>a</h5><h6>b</h6>')).toBe('<h4>a</h4><h4>b</h4>');
    });

    it('removes script and style content on the way in', () => {
        expect(cleanPastedHtml('<p>a</p><script>alert(1)</script><style>p{}</style>')).toBe('<p>a</p>');
    });

    it('strips event handlers', () => {
        expect(cleanPastedHtml('<p onclick="alert(1)">a</p>')).toBe('<p>a</p>');
    });

    it('drops an unsafe href but keeps the link text', () => {
        const result = cleanPastedHtml('<p><a href="javascript:alert(1)">click</a></p>');

        expect(result).not.toMatch(/javascript/i);
        expect(result).toContain('click');
    });

    it('keeps a safe link and its href', () => {
        expect(cleanPastedHtml('<p><a href="https://example.org">x</a></p>')).toBe(
            '<p><a href="https://example.org">x</a></p>',
        );
    });

    it('preserves list structure', () => {
        expect(cleanPastedHtml('<ul><li>One</li><li>Two</li></ul>')).toBe(
            '<ul><li>One</li><li>Two</li></ul>',
        );
    });

    it('keeps a table', () => {
        expect(cleanPastedHtml('<table><tr><td>A</td></tr></table>')).toContain('<td>A</td>');
    });

    it('collapses the runs of non-breaking spaces Word uses for indentation', () => {
        expect(cleanPastedHtml('<p>A&nbsp;&nbsp;&nbsp;B</p>')).toBe('<p>A B</p>');
    });

    it('keeps allowed table cell attributes and drops the rest', () => {
        const result = cleanPastedHtml('<table><tr><td colspan="2" bgcolor="red">A</td></tr></table>');

        expect(result).toContain('colspan="2"');
        expect(result).not.toContain('bgcolor');
    });
});

describe('plainTextToHtml', () => {
    it('splits blank-line separated blocks into paragraphs', () => {
        expect(plainTextToHtml('First para.\n\nSecond para.')).toBe(
            '<p>First para.</p><p>Second para.</p>',
        );
    });

    it('turns a single newline into a line break', () => {
        expect(plainTextToHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>');
    });

    it('escapes markup so pasted text cannot become markup', () => {
        expect(plainTextToHtml('<script>alert(1)</script>')).toBe(
            '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
        );
    });

    it('returns an empty string for whitespace only', () => {
        expect(plainTextToHtml('   \n\n  ')).toBe('');
    });
});

describe('normaliseEditorHtml', () => {
    it('treats what a cleared editor leaves behind as empty', () => {
        ['', '   ', '<br>', '<p><br></p>', '<p>&nbsp;</p>', '<p></p>'].forEach((html) =>
            expect(normaliseEditorHtml(html), html).toBe(''),
        );
    });

    it('leaves real content alone', () => {
        expect(normaliseEditorHtml('<p>Real content</p>')).toBe('<p>Real content</p>');
    });
});
