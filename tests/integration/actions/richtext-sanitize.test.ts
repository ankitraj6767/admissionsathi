import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@/lib/auth/rbac';

const session = vi.hoisted(() => ({ actor: null as SessionActor | null }));

/**
 * Rich-text sanitisation through the real write path.
 *
 * The unit tests cover `sanitizeRichText` in isolation; these prove the Server
 * Action actually applies it, so a request that never went near the browser
 * editor still cannot store script-bearing HTML. That distinction is the whole
 * point — the editor is a convenience, the schema is the boundary.
 */
vi.mock('@/lib/auth/session', async () => {
    const { AuthenticationError, AuthorizationError, can } = await import('@/lib/auth/rbac');
    return {
        getCurrentActor: async () => session.actor,
        requireActor: async () => {
            if (!session.actor) throw new AuthenticationError();
            return session.actor;
        },
        requirePermission: async (permission: Parameters<typeof can>[1]) => {
            if (!session.actor) throw new AuthenticationError();
            if (!can(session.actor, permission)) throw new AuthorizationError();
            return session.actor;
        },
    };
});

vi.mock('next/headers', () => ({
    headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.20', 'user-agent': 'vitest' }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
    updateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { createResourceAction, updateResourceAction } from '@/actions/admin/crud.actions';
import { FAQ } from '@/db/models/content.model';
import { EmailTemplate } from '@/db/models/system.model';
import { resolvePermissions } from '@/lib/auth/rbac';

const ADMIN: SessionActor = {
    id: String(new Types.ObjectId()),
    name: 'Priya Admin',
    email: 'priya@admissionsathi.org',
    roles: ['super_admin'],
    permissions: resolvePermissions(['super_admin']),
};

function faqValues(answerHtml: string) {
    return {
        question: 'What documents are required?',
        answerHtml,
        category: 'admissions',
        scope: 'global',
        status: 'active',
    };
}

async function createFaq(answerHtml: string) {
    const result = await createResourceAction('faqs', faqValues(answerHtml));
    if (!result.ok) throw new Error(`create failed: ${result.error}`);
    return result.data.id;
}

beforeEach(() => {
    session.actor = ADMIN;
});

describe('richtext fields are sanitised on create', () => {
    it('stores allowed formatting untouched', async () => {
        const id = await createFaq('<h2>Documents</h2><p>Bring your <strong>marksheet</strong>.</p>');

        expect((await FAQ.findById(id).lean())?.answerHtml).toBe(
            '<h2>Documents</h2><p>Bring your <strong>marksheet</strong>.</p>',
        );
    });

    it('strips a script tag before it reaches the database', async () => {
        const id = await createFaq('<p>Answer</p><script>alert(document.cookie)</script>');

        const stored = (await FAQ.findById(id).lean())?.answerHtml;
        expect(stored).toBe('<p>Answer</p>');
        expect(stored).not.toContain('script');
    });

    it('strips inline event handlers', async () => {
        const id = await createFaq('<p onclick="fetch(\'//evil.test\')">Answer</p>');

        expect((await FAQ.findById(id).lean())?.answerHtml).toBe('<p>Answer</p>');
    });

    it('neutralises a javascript: link but keeps the words', async () => {
        const id = await createFaq('<p><a href="javascript:alert(1)">Apply here</a></p>');

        const stored = (await FAQ.findById(id).lean())?.answerHtml ?? '';
        expect(stored).not.toMatch(/javascript/i);
        expect(stored).toContain('Apply here');
    });

    it('hardens an external link', async () => {
        const id = await createFaq('<p><a href="https://example.org">Official site</a></p>');

        expect((await FAQ.findById(id).lean())?.answerHtml).toContain(
            'rel="noopener noreferrer nofollow"',
        );
    });

    it('normalises editor markup to semantic tags', async () => {
        const id = await createFaq('<div><b>Bold</b> and <i>italic</i></div>');

        expect((await FAQ.findById(id).lean())?.answerHtml).toBe(
            '<p><strong>Bold</strong> and <em>italic</em></p>',
        );
    });

    it('rejects a required rich-text field that is only empty markup', async () => {
        const result = await createResourceAction('faqs', faqValues('<p><br></p>'));

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(result.ok === false && result.fieldErrors?.answerHtml).toBeDefined();
        expect(await FAQ.countDocuments({})).toBe(0);
    });
});

describe('richtext fields are sanitised on update', () => {
    it('cleans an edited value, not just the first write', async () => {
        const id = await createFaq('<p>Clean</p>');

        const result = await updateResourceAction(
            'faqs',
            id,
            faqValues('<p>Edited</p><iframe src="https://evil.test"></iframe>'),
        );

        expect(result.ok).toBe(true);
        expect((await FAQ.findById(id).lean())?.answerHtml).toBe('<p>Edited</p>');
    });
});

describe('the email policy keeps template markup usable', () => {
    it('preserves inline styles an email client needs', async () => {
        const result = await createResourceAction('email-templates', {
            key: 'test.template',
            name: 'Test template',
            subject: 'Hello {{name}}',
            bodyHtml: '<p style="color:#073174;text-align:center">Hi {{name}}</p>',
            status: 'active',
        });

        expect(result.ok).toBe(true);
        const stored = (await EmailTemplate.findOne({ key: 'test.template' }).lean())?.bodyHtml ?? '';
        expect(stored).toContain('color:#073174');
        expect(stored).toContain('{{name}}');
    });

    it('still refuses a script inside an email template', async () => {
        await createResourceAction('email-templates', {
            key: 'test.script',
            name: 'Script template',
            subject: 'x',
            bodyHtml: '<p>Hi</p><script>alert(1)</script>',
            status: 'active',
        });

        const stored = (await EmailTemplate.findOne({ key: 'test.script' }).lean())?.bodyHtml ?? '';
        expect(stored).toBe('<p>Hi</p>');
    });
});
