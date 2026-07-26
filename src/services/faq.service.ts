import 'server-only';
import { listFaqs } from '@/db/repositories/content.repository';
import { CACHE_TAGS, CACHE_TTL, cached } from '@/lib/cache';
import { slugify, stripHtml, truncate } from '@/lib/utils';

/** RSC-safe FAQ shape — no ObjectIds or Dates cross the service boundary. */
export interface FaqItemView {
    id: string;
    question: string;
    answerHtml: string;
    /** Plain-text answer, used for FAQPage JSON-LD. */
    answerText: string;
    category: string;
    isFeatured: boolean;
    displayOrder: number;
}

export interface FaqCategoryGroup {
    category: string;
    /** Anchor id used by the in-page category navigation. */
    slug: string;
    items: FaqItemView[];
}

export interface GlobalFaqs {
    total: number;
    featured: FaqItemView[];
    groups: FaqCategoryGroup[];
}

const MAX_FAQS = 200;

function toView(faq: {
    _id: unknown;
    question: string;
    answerHtml: string;
    category: string;
    isFeatured?: boolean;
    displayOrder?: number;
}): FaqItemView {
    return {
        id: String(faq._id),
        question: faq.question,
        answerHtml: faq.answerHtml,
        answerText: truncate(stripHtml(faq.answerHtml), 1200),
        category: faq.category,
        isFeatured: Boolean(faq.isFeatured),
        displayOrder: faq.displayOrder ?? 0,
    };
}

const loadGlobalFaqs = cached(
    async (): Promise<GlobalFaqs> => {
        // Repository already filters to active FAQs and sorts by displayOrder.
        const faqs = (await listFaqs('global', undefined, MAX_FAQS)).map(toView);

        const groups: FaqCategoryGroup[] = [];
        for (const faq of faqs) {
            const category = faq.category?.trim() || 'General';
            const existing = groups.find((group) => group.category === category);
            if (existing) existing.items.push(faq);
            else groups.push({ category, slug: `faq-${slugify(category)}`, items: [faq] });
        }

        return {
            total: faqs.length,
            featured: faqs.filter((faq) => faq.isFeatured),
            groups,
        };
    },
    ['global-faqs'],
    { tags: [CACHE_TAGS.faqs], revalidate: CACHE_TTL.long },
);

/**
 * Published, site-wide FAQs grouped by category for the /faqs page.
 * Grouping happens in the service (not the page) so the cached payload is
 * render-ready and the page stays a pure view.
 */
export async function listGlobalFaqs(): Promise<GlobalFaqs> {
    return loadGlobalFaqs();
}
