import 'server-only';
import { connectToDatabase } from '@/db/connect';
import { ContactSubmission } from '@/db/models/lead.model';

export interface CreateContactSubmissionInput {
    name: string;
    email: string;
    phone?: string;
    /** Already resolved to its human label by the caller. */
    subject: string;
    message: string;
    handled?: boolean;
}

/**
 * Writes a public contact-form message.
 * Returns the new id because the caller needs it for the acknowledgement
 * notification, the internal staff alert and the audit record.
 */
export async function createContactSubmission(
    input: CreateContactSubmissionInput,
): Promise<string> {
    await connectToDatabase();
    const created = await ContactSubmission.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        handled: input.handled ?? false,
    });
    return String(created._id);
}
