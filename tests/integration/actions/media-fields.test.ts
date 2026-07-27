import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionActor } from '@/lib/auth/rbac';

const session = vi.hoisted(() => ({ actor: null as SessionActor | null }));

/**
 * Image, gallery and video fields through the real Server Action.
 *
 * The important assertions here are the ones about *derived* values: a video's
 * `embedUrl` is recomputed on the server rather than trusted from the request, so
 * a crafted payload cannot put an arbitrary origin into an `iframe src` on a
 * public page.
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
    headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.30', 'user-agent': 'vitest' }),
}));

vi.mock('next/cache', () => ({
    revalidatePath: () => undefined,
    revalidateTag: () => undefined,
    updateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { createResourceAction, updateResourceAction } from '@/actions/admin/crud.actions';
import { College } from '@/db/models/college.model';
import { State } from '@/db/models/geo.model';
import { City } from '@/db/models/geo.model';
import { resolvePermissions } from '@/lib/auth/rbac';

const ADMIN: SessionActor = {
    id: String(new Types.ObjectId()),
    name: 'Priya Admin',
    email: 'priya@admissionsathi.org',
    roles: ['super_admin'],
    permissions: resolvePermissions(['super_admin']),
};

let stateId: string;
let cityId: string;

async function seedGeo() {
    const state = await State.create({
        name: 'Telangana',
        slug: 'telangana',
        code: 'TS',
        status: 'active',
    });
    const city = await City.create({
        name: 'Hyderabad',
        slug: 'hyderabad',
        state: state._id,
        stateName: 'Telangana',
        status: 'active',
    });
    stateId = String(state._id);
    cityId = String(city._id);
}

function collegeValues(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Silverpeak Institute of Engineering',
        slug: 'silverpeak-institute',
        state: stateId,
        city: cityId,
        ownership: 'Private',
        status: 'published',
        ...overrides,
    };
}

async function createCollege(overrides: Record<string, unknown> = {}) {
    const result = await createResourceAction('colleges', collegeValues(overrides));
    if (!result.ok) throw new Error(`create failed: ${result.error}`);
    return result.data.id;
}

beforeEach(async () => {
    session.actor = ADMIN;
    await seedGeo();
});

describe('image fields', () => {
    it('stores a picked logo as an ImageRef', async () => {
        const mediaId = String(new Types.ObjectId());
        const id = await createCollege({
            logo: { url: '/uploads/logo.png', alt: 'Silverpeak crest', width: 240, height: 240, mediaId },
        });

        const stored = await College.findById(id).lean();
        expect(stored?.logo).toMatchObject({
            url: '/uploads/logo.png',
            alt: 'Silverpeak crest',
            width: 240,
            height: 240,
        });
        expect(String(stored?.logo?.mediaId)).toBe(mediaId);
    });

    it('treats an image with no URL as cleared rather than invalid', async () => {
        const id = await createCollege({ logo: { url: '', alt: '' } });

        expect((await College.findById(id).lean())?.logo?.url).toBeUndefined();
    });

    it('removes a logo when the field is cleared on update', async () => {
        const id = await createCollege({ logo: { url: '/uploads/logo.png' } });
        expect((await College.findById(id).lean())?.logo?.url).toBe('/uploads/logo.png');

        const result = await updateResourceAction('colleges', id, collegeValues({ logo: undefined }));

        expect(result.ok).toBe(true);
        expect((await College.findById(id).lean())?.logo?.url).toBeUndefined();
    });

    it('refuses a javascript: image URL', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({ logo: { url: 'javascript:alert(1)' } }),
        );

        expect(result.ok).toBe(false);
        expect(await College.countDocuments({})).toBe(0);
    });
});

describe('gallery field', () => {
    it('stores images in the submitted order', async () => {
        const id = await createCollege({
            gallery: [
                { kind: 'image', url: '/uploads/a.jpg', alt: 'Quad', displayOrder: 0 },
                { kind: 'image', url: '/uploads/b.jpg', caption: 'Library', displayOrder: 1 },
            ],
        });

        const stored = await College.findById(id).lean();
        expect(stored?.gallery).toHaveLength(2);
        expect(stored?.gallery[0]).toMatchObject({ kind: 'image', url: '/uploads/a.jpg', alt: 'Quad' });
        expect(stored?.gallery[1]).toMatchObject({ caption: 'Library', displayOrder: 1 });
    });

    it('derives embedUrl and thumbnailUrl for a video from its source URL', async () => {
        const id = await createCollege({
            gallery: [
                {
                    kind: 'video',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    caption: 'Campus walkthrough',
                    displayOrder: 0,
                },
            ],
        });

        expect((await College.findById(id).lean())?.gallery[0]).toMatchObject({
            kind: 'video',
            videoProvider: 'youtube',
            embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
            thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        });
    });

    /**
     * The browser sends `embedUrl`, but the server must not trust it — otherwise a
     * crafted request chooses what a public page loads in an iframe.
     */
    it('overwrites a forged embedUrl with the one derived server-side', async () => {
        const id = await createCollege({
            gallery: [
                {
                    kind: 'video',
                    url: 'https://youtu.be/dQw4w9WgXcQ',
                    embedUrl: 'https://evil.test/steal',
                    thumbnailUrl: 'https://evil.test/pixel.png',
                    displayOrder: 0,
                },
            ],
        });

        const item = (await College.findById(id).lean())?.gallery[0];
        expect(item?.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
        expect(item?.thumbnailUrl).not.toContain('evil.test');
    });

    it('rejects a gallery video with an unsupported URL', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({
                gallery: [{ kind: 'video', url: 'https://evil.test/video', displayOrder: 0 }],
            }),
        );

        expect(result.ok).toBe(false);
        expect(await College.countDocuments({})).toBe(0);
    });

    it('rejects a gallery image with an unsafe URL', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({
                gallery: [{ kind: 'image', url: 'javascript:alert(1)', displayOrder: 0 }],
            }),
        );

        expect(result.ok).toBe(false);
    });

    it('defaults a legacy item with no kind to an image', async () => {
        const id = await createCollege({ gallery: [{ url: '/uploads/legacy.jpg' }] });

        expect((await College.findById(id).lean())?.gallery[0]).toMatchObject({
            kind: 'image',
            url: '/uploads/legacy.jpg',
        });
    });

    it('replaces the whole gallery on update, so removals persist', async () => {
        const id = await createCollege({
            gallery: [
                { kind: 'image', url: '/uploads/a.jpg', displayOrder: 0 },
                { kind: 'image', url: '/uploads/b.jpg', displayOrder: 1 },
            ],
        });

        await updateResourceAction(
            'colleges',
            id,
            collegeValues({ gallery: [{ kind: 'image', url: '/uploads/b.jpg', displayOrder: 0 }] }),
        );

        const stored = await College.findById(id).lean();
        expect(stored?.gallery).toHaveLength(1);
        expect(stored?.gallery[0]?.url).toBe('/uploads/b.jpg');
    });

    it('empties the gallery when every item is removed', async () => {
        const id = await createCollege({
            gallery: [{ kind: 'image', url: '/uploads/a.jpg', displayOrder: 0 }],
        });

        await updateResourceAction('colleges', id, collegeValues({ gallery: [] }));

        expect((await College.findById(id).lean())?.gallery).toEqual([]);
    });

    it('caps a gallery at 60 items', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({
                gallery: Array.from({ length: 61 }, (_, index) => ({
                    kind: 'image',
                    url: `/uploads/${index}.jpg`,
                    displayOrder: index,
                })),
            }),
        );

        expect(result.ok).toBe(false);
    });
});

describe('video field', () => {
    it('normalises a watch URL to a provider embed URL', async () => {
        const id = await createCollege({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

        expect((await College.findById(id).lean())?.videoUrl).toBe(
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        );
    });

    it('rejects an unsupported video URL with a field error', async () => {
        const result = await createResourceAction(
            'colleges',
            collegeValues({ videoUrl: 'not-a-url' }),
        );

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.code).toBe('VALIDATION');
        expect(await College.countDocuments({})).toBe(0);
    });

    it('accepts an empty value as no video', async () => {
        const id = await createCollege({ videoUrl: '' });

        expect((await College.findById(id).lean())?.videoUrl).toBeUndefined();
    });

    it('clears a previously set video', async () => {
        const id = await createCollege({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ' });

        await updateResourceAction('colleges', id, collegeValues({ videoUrl: '' }));

        expect((await College.findById(id).lean())?.videoUrl).toBeUndefined();
    });
});
