import { siteConfig } from '@/config/site';

/**
 * Branded HTML shell for transactional email.
 *
 * Hand-written table markup with inline styles on purpose: Gmail, Outlook and
 * most Indian webmail clients strip `<style>` blocks, flexbox and CSS custom
 * properties, so the design tokens are duplicated here as literal values rather
 * than imported from Tailwind.
 */
const COLORS = {
    navy: '#073174',
    navyDark: '#05265C',
    orange: '#FF6B17',
    page: '#F5F8FD',
    card: '#FFFFFF',
    ink: '#12213D',
    inkSoft: '#667085',
    border: '#E5EAF2',
} as const;

const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";

/** Minimal HTML entity escaping for values interpolated into the template. */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Resolves a relative path against the public site URL, as email needs absolute links. */
export function absoluteEmailUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${siteConfig.url.replace(/\/$/, '')}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Turns the plain-text body a notification carries into paragraphs, keeping
 * blank-line separation and linkifying nothing (links come from `action`).
 */
function paragraphs(body: string): string {
    return body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map(
            (block) =>
                `<p style="margin:0 0 12px;font-size:14px;line-height:22px;color:${COLORS.ink};">${escapeHtml(
                    block,
                ).replace(/\n/g, '<br />')}</p>`,
        )
        .join('');
}

export interface EmailLayoutInput {
    title: string;
    body: string;
    action?: { label: string; url: string };
    /** Small print under the divider, e.g. a booking reference. */
    footnote?: string;
    brandName?: string;
    /** Set for marketing-style mail so the unsubscribe line is shown. */
    showPreferencesLink?: boolean;
}

/** Renders the full branded HTML document for one email. */
export function renderEmailHtml(input: EmailLayoutInput): string {
    const brand = escapeHtml(input.brandName ?? siteConfig.name);
    const heading = escapeHtml(input.title);

    const button = input.action
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;">
    <tr><td style="border-radius:10px;background:${COLORS.orange};">
      <a href="${escapeHtml(absoluteEmailUrl(input.action.url))}"
         style="display:inline-block;padding:12px 22px;font-family:${FONT_STACK};font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">
        ${escapeHtml(input.action.label)}
      </a>
    </td></tr>
  </table>`
        : '';

    const footnote = input.footnote
        ? `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid ${COLORS.border};font-size:12px;line-height:18px;color:${COLORS.inkSoft};">${escapeHtml(
            input.footnote,
        )}</p>`
        : '';

    const preferences = input.showPreferencesLink
        ? `<p style="margin:6px 0 0;font-size:11px;color:${COLORS.inkSoft};">
        Manage which emails you receive in your
        <a href="${escapeHtml(absoluteEmailUrl('/dashboard/notifications'))}" style="color:${COLORS.navy};">notification preferences</a>.
      </p>`
        : '';

    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:${FONT_STACK};">
<div style="display:none;font-size:1px;color:${COLORS.page};max-height:0;overflow:hidden;">${heading}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
      <tr><td style="background:${COLORS.navy};padding:18px 24px;">
        <span style="font-size:17px;font-weight:800;color:#FFFFFF;letter-spacing:-0.2px;">${brand}</span>
        <span style="display:block;margin-top:2px;font-size:11px;color:rgba(255,255,255,0.75);">${escapeHtml(siteConfig.tagline)}</span>
      </td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:19px;line-height:26px;font-weight:800;color:${COLORS.navyDark};">${heading}</h1>
        ${paragraphs(input.body)}
        ${button}
        ${footnote}
      </td></tr>
      <tr><td style="padding:16px 24px 22px;background:${COLORS.page};border-top:1px solid ${COLORS.border};">
        <p style="margin:0;font-size:11px;line-height:17px;color:${COLORS.inkSoft};">
          You are receiving this because you contacted ${brand}.
          Figures such as fees, cut-offs and deadlines change — always confirm them with the official source.
        </p>
        ${preferences}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Plain-text alternative, for clients that refuse HTML. */
export function renderEmailText(input: EmailLayoutInput): string {
    const lines = [input.title, '', input.body];
    if (input.action) lines.push('', `${input.action.label}: ${absoluteEmailUrl(input.action.url)}`);
    if (input.footnote) lines.push('', input.footnote);
    lines.push('', `— ${input.brandName ?? siteConfig.name}`);
    return lines.join('\n');
}
