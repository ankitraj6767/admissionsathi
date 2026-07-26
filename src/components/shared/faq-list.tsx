'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { FaqItemView } from '@/services/faq.service';

/**
 * Interactive FAQ accordion.
 * Takes already-shaped plain data from the service so the client bundle never
 * pulls in database types.
 */
export function FaqList({
    faqs,
    defaultOpenFirst = false,
    className,
}: {
    faqs: FaqItemView[];
    defaultOpenFirst?: boolean;
    className?: string;
}) {
    if (faqs.length === 0) return null;

    return (
        <Accordion
            type="single"
            collapsible
            defaultValue={defaultOpenFirst ? faqs[0]?.id : undefined}
            className={cn('divide-y divide-line', className)}
        >
            {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>
                        <div
                            className="prose-sathi text-[12.5px]"
                            // Answers are authored by staff in the admin CMS and sanitised on write.
                            dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                        />
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
