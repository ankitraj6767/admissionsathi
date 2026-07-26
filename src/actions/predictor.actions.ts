'use server';

import { predictorLeadSchema, predictorRunSchema } from '@/schemas/predictor.schema';
import { attachUserToSession, runPrediction, type PredictionResult } from '@/services/predictor.service';
import { createLeadFromForm } from '@/services/lead.service';
import { getCurrentActor } from '@/lib/auth/session';
import { RATE_LIMITS, rateLimit } from '@/lib/rate-limit';
import { NotFoundError, fail, runAction, succeed } from '@/lib/action-helpers';
import { connectToDatabase } from '@/db/connect';
import { PredictionSession } from '@/db/models/predictor.model';
import type { ActionResult } from '@/types/common';

/** Runs a predictor and returns the probability bands. */
export async function runPredictorAction(input: unknown): Promise<ActionResult<PredictionResult>> {
    return runAction({ action: 'predictor.run' }, async () => {
        const data = predictorRunSchema.parse(input);

        const limited = await rateLimit(RATE_LIMITS.predictorRun);
        if (!limited.success) {
            return fail(
                `Too many predictions from this device. Try again in ${Math.ceil(limited.retryAfterSeconds / 60)} minute(s).`,
                'RATE_LIMITED',
            );
        }

        const result = await runPrediction(data);
        if (!result) throw new NotFoundError('Predictor not found or not published.');

        const actor = await getCurrentActor();
        if (actor) await attachUserToSession(result.sessionId, actor.id);

        if (result.rows.length === 0) {
            return succeed(
                result,
                'No historical matches for these inputs. Try widening the branch, quota or round filters.',
            );
        }

        return succeed(result, `${result.totalMatched} matching options found.`);
    });
}

/** Captures a lead against a completed prediction session. */
export async function savePredictorLeadAction(
    input: unknown,
): Promise<ActionResult<{ reference: string }>> {
    return runAction({ action: 'predictor.lead' }, async () => {
        const data = predictorLeadSchema.parse(input);

        await connectToDatabase();
        const session = await PredictionSession.findById(data.sessionId).exec();
        if (!session) throw new NotFoundError('Prediction session expired. Please run the predictor again.');

        const actor = await getCurrentActor();

        const { lead } = await createLeadFromForm({
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            consent: data.consent,
            source: 'predictor_submission',
            sourceDetail: session.predictorSlug,
            idempotencyKey: data.idempotencyKey,
            courseInterest: '',
            preferredTime: '',
            stateId: '',
            cityId: '',
            message: `Predictor: ${session.predictorSlug} • ${session.resultCount} results`,
            userId: actor?.id,
        });

        session.leadCaptured = true;
        session.lead = lead._id;
        await session.save();

        return succeed({ reference: lead.reference }, 'Saved. A counsellor will review your result list.');
    });
}
