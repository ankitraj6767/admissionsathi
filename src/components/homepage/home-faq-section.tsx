import { Card, SectionHeader } from '@/components/ui/primitives';
import { FaqAccordion } from '@/components/shared/content-blocks';
import type { FaqDoc } from '@/db/models/content.model';

/**
 * Homepage FAQ.
 *
 * Answers the objections that otherwise end a visit — is it really free, how
 * accurate is the predictor — and, when structured data is enabled, feeds a
 * `FAQPage` block emitted by the page. Two columns on desktop so six questions do
 * not push the stats strip below the fold.
 */
export function HomeFaqSection({
    heading,
    description,
    ctaLabel,
    ctaUrl,
    faqs,
}: {
    heading: string;
    description?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    faqs: FaqDoc[];
}) {
    if (faqs.length === 0) return null;

    const midpoint = Math.ceil(faqs.length / 2);
    const columns = [faqs.slice(0, midpoint), faqs.slice(midpoint)].filter((c) => c.length > 0);

    return (
        <Card as="section" aria-labelledby="home-faq-heading">
            <SectionHeader
                title={heading}
                description={description}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
                compact
            />

            <div className="grid gap-x-6 lg:grid-cols-2">
                {columns.map((column, index) => (
                    <FaqAccordion
                        key={index}
                        faqs={column.map((faq) => ({ question: faq.question, answer: faq.answerHtml }))}
                    />
                ))}
            </div>
        </Card>
    );
}
