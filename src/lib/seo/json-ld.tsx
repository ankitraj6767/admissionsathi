import { siteConfig } from '@/config/site';
import { absoluteUrl, stripHtml, truncate } from '@/lib/utils';

type Json = Record<string, unknown>;

/** Renders one or many JSON-LD blocks. Values are JSON-serialised, never raw HTML. */
export function JsonLd({ data }: { data: Json | Json[] }) {
    const blocks = Array.isArray(data) ? data : [data];
    return (
        <>
        {
            blocks.map((block, index) => (
                <script
          key= { index }
          type = "application/ld+json"
          // JSON.stringify output is safe here: no user HTML is interpolated.
          dangerouslySetInnerHTML = {{ __html: JSON.stringify(block).replace(/</g, '\\u003c') }}
        />
      ))
}
</>
  );
}

export function buildOrganizationJsonLd(settings: Record<string, unknown>): Json {
    const phone = typeof settings['contact.phone'] === 'string' ? settings['contact.phone'] : undefined;
    const email = typeof settings['contact.email'] === 'string' ? settings['contact.email'] : undefined;
    const socials = [
        'social.facebook',
        'social.instagram',
        'social.youtube',
        'social.linkedin',
        'social.twitter',
    ]
        .map((key) => settings[key])
        .filter((v): v is string => typeof v === 'string' && v.length > 0);

    return {
        '@context': 'https://schema.org',
        '@type': 'EducationalOrganization',
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        url: siteConfig.url,
        logo: absoluteUrl('/brand/logo.svg'),
        slogan: siteConfig.tagline,
        description: siteConfig.description,
        sameAs: socials,
        contactPoint: [
            {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                telephone: phone,
                email,
                areaServed: 'IN',
                availableLanguage: ['English', 'Hindi'],
            },
        ],
    };
}

export function buildWebsiteJsonLd(): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url: siteConfig.url,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

export function buildBreadcrumbJsonLd(items: { label: string; href?: string }[]): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            ...(item.href ? { item: absoluteUrl(item.href) } : {}),
        })),
    };
}

export function buildFaqJsonLd(faqs: { question: string; answer: string }[]): Json | null {
    if (faqs.length === 0) return null;
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: stripHtml(faq.answer) },
        })),
    };
}

export function buildArticleJsonLd(article: {
    title: string;
    slug: string;
    excerpt?: string;
    contentHtml?: string;
    image?: string;
    authorName?: string;
    publishedAt?: string | Date;
    updatedAt?: string | Date;
}): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: truncate(article.title, 110),
        description: truncate(article.excerpt ?? stripHtml(article.contentHtml ?? ''), 250),
        image: article.image ? [article.image] : undefined,
        author: { '@type': article.authorName ? 'Person' : 'Organization', name: article.authorName ?? siteConfig.name },
        publisher: {
            '@type': 'Organization',
            name: siteConfig.name,
            logo: { '@type': 'ImageObject', url: absoluteUrl('/brand/logo.svg') },
        },
        datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
        dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
        mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/articles/${article.slug}`) },
    };
}

/**
 * College schema.
 * Only emits fields we actually hold, so we never publish invented ratings or fees.
 */
export function buildCollegeJsonLd(college: {
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    cityName?: string;
    stateName?: string;
    address?: string;
    phone?: string;
    website?: string;
    foundingDate?: number;
    rating?: { overall: number; count: number };
}): Json {
    const json: Json = {
        '@context': 'https://schema.org',
        '@type': 'CollegeOrUniversity',
        name: college.name,
        url: absoluteUrl(`/colleges/${college.slug}`),
        description: college.description ? truncate(college.description, 300) : undefined,
        logo: college.logoUrl,
        telephone: college.phone,
        sameAs: college.website,
        foundingDate: college.foundingDate ? String(college.foundingDate) : undefined,
        address: {
            '@type': 'PostalAddress',
            streetAddress: college.address,
            addressLocality: college.cityName,
            addressRegion: college.stateName,
            addressCountry: 'IN',
        },
    };

    if (college.rating && college.rating.count > 0 && college.rating.overall > 0) {
        json.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: college.rating.overall.toFixed(1),
            reviewCount: college.rating.count,
            bestRating: '5',
            worstRating: '1',
        };
    }

    return json;
}

export function buildCourseJsonLd(course: {
    name: string;
    slug: string;
    description?: string;
    durationMonths?: number;
    level?: string;
}): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.name,
        description: course.description ? truncate(stripHtml(course.description), 300) : undefined,
        url: absoluteUrl(`/courses/${course.slug}`),
        provider: { '@type': 'Organization', name: siteConfig.name, sameAs: siteConfig.url },
        educationalLevel: course.level,
        timeRequired: course.durationMonths ? `P${course.durationMonths}M` : undefined,
        hasCourseInstance: course.durationMonths
            ? [
                {
                    '@type': 'CourseInstance',
                    courseMode: 'Full Time',
                    courseWorkload: `P${course.durationMonths}M`,
                },
            ]
            : undefined,
    };
}

export function buildEventJsonLd(exam: {
    name: string;
    slug: string;
    startDate?: string | Date;
    endDate?: string | Date;
    description?: string;
    organizer?: string;
}): Json | null {
    if (!exam.startDate) return null;
    return {
        '@context': 'https://schema.org',
        '@type': 'EducationEvent',
        name: exam.name,
        startDate: new Date(exam.startDate).toISOString(),
        endDate: exam.endDate ? new Date(exam.endDate).toISOString() : undefined,
        url: absoluteUrl(`/exams/${exam.slug}`),
        description: exam.description ? truncate(stripHtml(exam.description), 250) : undefined,
        organizer: exam.organizer ? { '@type': 'Organization', name: exam.organizer } : undefined,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    };
}

export function buildItemListJsonLd(
    items: { name: string; url: string }[],
    listName: string,
): Json {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: listName,
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: absoluteUrl(item.url),
        })),
    };
}
