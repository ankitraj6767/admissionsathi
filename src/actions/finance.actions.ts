'use server';

import { z } from 'zod';
import { calculateEmi, estimateEligibility, type EligibilityResult, type EmiResult } from '@/lib/finance/emi';
import { saveLoanCalculation } from '@/services/finance.service';
import { createLeadFromForm } from '@/services/lead.service';
import { getCurrentActor } from '@/lib/auth/session';
import { runAction, succeed } from '@/lib/action-helpers';
import type { ActionResult } from '@/types/common';

const calculatorSchema = z.object({
    courseFee: z.coerce.number().min(0).max(100_000_000).optional(),
    loanAmount: z.coerce.number().min(10_000).max(50_000_000),
    interestRate: z.coerce.number().min(1).max(30),
    tenureMonths: z.coerce.number().int().min(6).max(360),
    moratoriumMonths: z.coerce.number().int().min(0).max(120).default(0),
    processingFeePercent: z.coerce.number().min(0).max(10).default(0),
    anonymousId: z.string().max(80).optional(),
    providerId: z.string().optional(),
});

/** Runs the EMI maths on the server and stores the calculation for history. */
export async function calculateLoanAction(
    input: unknown,
): Promise<ActionResult<{ result: EmiResult; calculationId?: string }>> {
    return runAction({ action: 'loan.calculate' }, async () => {
        const data = calculatorSchema.parse(input);

        const result = calculateEmi({
            loanAmount: data.loanAmount,
            annualRatePercent: data.interestRate,
            tenureMonths: data.tenureMonths,
            moratoriumMonths: data.moratoriumMonths,
            processingFeePercent: data.processingFeePercent,
        });

        const actor = await getCurrentActor();
        const calculationId = await saveLoanCalculation({
            userId: actor?.id,
            anonymousId: data.anonymousId,
            courseFee: data.courseFee,
            loanAmount: data.loanAmount,
            interestRate: data.interestRate,
            tenureMonths: data.tenureMonths,
            moratoriumMonths: data.moratoriumMonths,
            processingFeePercent: data.processingFeePercent,
            result,
            providerId: data.providerId,
        }).catch(() => undefined);

        return succeed({ result, calculationId });
    });
}

const eligibilitySchema = z.object({
    courseFee: z.coerce.number().min(10_000).max(50_000_000),
    coApplicantMonthlyIncome: z.coerce.number().min(0).max(10_000_000),
    existingMonthlyEmi: z.coerce.number().min(0).max(1_000_000).default(0),
    collateralValue: z.coerce.number().min(0).max(500_000_000).optional(),
    isCollateralAvailable: z.boolean().default(false),
    courseType: z.enum(['domestic', 'abroad']).default('domestic'),
    cibilBand: z.enum(['excellent', 'good', 'average', 'unknown']).default('unknown'),
});

export async function checkLoanEligibilityAction(
    input: unknown,
): Promise<ActionResult<EligibilityResult>> {
    return runAction({ action: 'loan.eligibility' }, async () => {
        const data = eligibilitySchema.parse(input);
        return succeed(estimateEligibility(data));
    });
}

const loanEnquirySchema = z.object({
    name: z.string().trim().min(2).max(120),
    phone: z
        .string()
        .trim()
        .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
    loanAmount: z.coerce.number().min(10_000).max(50_000_000).optional(),
    providerSlug: z.string().max(140).optional(),
    consent: z.boolean().refine((v) => v, 'Please accept the consent to continue'),
    idempotencyKey: z.string().min(8).max(64),
});

export async function submitLoanEnquiryAction(
    input: unknown,
): Promise<ActionResult<{ reference: string }>> {
    return runAction({ action: 'loan.enquiry' }, async () => {
        const data = loanEnquirySchema.parse(input);
        const actor = await getCurrentActor();

        const { lead } = await createLeadFromForm({
            name: data.name,
            phone: data.phone,
            email: data.email || '',
            courseInterest: '',
            preferredTime: '',
            stateId: '',
            cityId: '',
            message: data.loanAmount
                ? `Loan enquiry for ₹${data.loanAmount.toLocaleString('en-IN')}${data.providerSlug ? ` • ${data.providerSlug}` : ''}`
                : 'Education loan enquiry',
            consent: data.consent,
            source: 'loan_enquiry',
            sourceDetail: data.providerSlug,
            idempotencyKey: data.idempotencyKey,
            userId: actor?.id,
        });

        return succeed({ reference: lead.reference }, 'Enquiry received. A finance counsellor will call you.');
    });
}
