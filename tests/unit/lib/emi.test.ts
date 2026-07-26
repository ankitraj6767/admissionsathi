import { describe, expect, it } from 'vitest';
import { calculateEmi, estimateEligibility } from '@/lib/finance/emi';

describe('calculateEmi', () => {
    it('computes the standard EMI for a plain loan', () => {
        const result = calculateEmi({
            loanAmount: 1_000_000,
            annualRatePercent: 10,
            tenureMonths: 84,
        });

        // Textbook EMI for 10L @ 10% over 84 months ≈ ₹16,601
        expect(result.emi).toBeGreaterThan(16_590);
        expect(result.emi).toBeLessThan(16_615);
        expect(result.principal).toBe(1_000_000);
        expect(result.moratoriumInterest).toBe(0);
        expect(result.processingFee).toBe(0);
        expect(result.schedule).toHaveLength(84);
        expect(result.effectiveTenureMonths).toBe(84);
    });

    it('keeps total repayment = principal + total interest and total cost includes the fee', () => {
        const result = calculateEmi({
            loanAmount: 800_000,
            annualRatePercent: 11.25,
            tenureMonths: 60,
            processingFeePercent: 1,
        });

        expect(result.totalRepayment).toBeCloseTo(result.principal + result.totalInterest, 2);
        expect(result.processingFee).toBeCloseTo(8_000, 2);
        expect(result.totalCost).toBeCloseTo(result.totalRepayment + result.processingFee, 2);
        expect(result.totalInterest).toBeGreaterThan(0);
    });

    it('amortises fully — the final closing balance is zero', () => {
        const result = calculateEmi({
            loanAmount: 450_000,
            annualRatePercent: 9.5,
            tenureMonths: 36,
        });

        const last = result.schedule.at(-1);
        expect(last?.month).toBe(36);
        expect(last?.closingBalance).toBe(0);
    });

    it('produces a schedule whose interest sums to totalInterest and principal sums to the principal', () => {
        const result = calculateEmi({
            loanAmount: 250_000,
            annualRatePercent: 12,
            tenureMonths: 24,
        });

        const interestSum = result.schedule.reduce((acc, row) => acc + row.interest, 0);
        const principalSum = result.schedule.reduce((acc, row) => acc + row.principal, 0);

        expect(interestSum).toBeCloseTo(result.totalInterest, 1);
        expect(principalSum).toBeCloseTo(result.principal, 1);
    });

    it('opening balance of each row equals the previous closing balance', () => {
        const { schedule } = calculateEmi({
            loanAmount: 300_000,
            annualRatePercent: 8.75,
            tenureMonths: 18,
        });

        for (let i = 1; i < schedule.length; i += 1) {
            expect(schedule[i]!.openingBalance).toBeCloseTo(schedule[i - 1]!.closingBalance, 2);
        }
    });

    describe('moratorium handling', () => {
        it('accrues simple interest and capitalises it into the principal by default', () => {
            const loanAmount = 600_000;
            const annualRatePercent = 10;
            const moratoriumMonths = 12;
            const result = calculateEmi({
                loanAmount,
                annualRatePercent,
                tenureMonths: 60,
                moratoriumMonths,
            });

            const expectedMoratoriumInterest =
                loanAmount * (annualRatePercent / 12 / 100) * moratoriumMonths;

            expect(result.moratoriumInterest).toBeCloseTo(expectedMoratoriumInterest, 2);
            expect(result.principal).toBeCloseTo(loanAmount + expectedMoratoriumInterest, 2);
            expect(result.effectiveTenureMonths).toBe(result.schedule.length + moratoriumMonths);
        });

        it('does not capitalise when capitaliseMoratoriumInterest is false', () => {
            const result = calculateEmi({
                loanAmount: 600_000,
                annualRatePercent: 10,
                tenureMonths: 60,
                moratoriumMonths: 12,
                capitaliseMoratoriumInterest: false,
            });

            expect(result.moratoriumInterest).toBeGreaterThan(0);
            expect(result.principal).toBe(600_000);
        });

        it('a moratorium raises the EMI when interest is capitalised', () => {
            const base = { loanAmount: 600_000, annualRatePercent: 10, tenureMonths: 60 };
            const withoutMoratorium = calculateEmi(base);
            const withMoratorium = calculateEmi({ ...base, moratoriumMonths: 12 });

            expect(withMoratorium.emi).toBeGreaterThan(withoutMoratorium.emi);
        });

        it('zero moratorium months accrue no moratorium interest', () => {
            const result = calculateEmi({
                loanAmount: 600_000,
                annualRatePercent: 10,
                tenureMonths: 60,
                moratoriumMonths: 0,
            });

            expect(result.moratoriumInterest).toBe(0);
            expect(result.principal).toBe(600_000);
        });
    });

    describe('edge cases', () => {
        it('handles a zero-interest loan as a straight principal split', () => {
            const result = calculateEmi({
                loanAmount: 120_000,
                annualRatePercent: 0,
                tenureMonths: 12,
            });

            expect(result.emi).toBe(10_000);
            expect(result.totalInterest).toBe(0);
            expect(result.moratoriumInterest).toBe(0);
            expect(result.totalRepayment).toBe(120_000);
            expect(result.schedule).toHaveLength(12);
            expect(result.schedule.every((row) => row.interest === 0)).toBe(true);
            expect(result.schedule.at(-1)?.closingBalance).toBe(0);
        });

        it('returns an empty result for a non-positive loan amount', () => {
            const result = calculateEmi({ loanAmount: 0, annualRatePercent: 10, tenureMonths: 60 });

            expect(result).toMatchObject({
                emi: 0,
                principal: 0,
                totalInterest: 0,
                totalRepayment: 0,
                totalCost: 0,
                effectiveTenureMonths: 0,
            });
            expect(result.schedule).toEqual([]);
        });

        it('returns an empty result for a non-positive tenure', () => {
            const result = calculateEmi({ loanAmount: 500_000, annualRatePercent: 10, tenureMonths: 0 });

            expect(result.emi).toBe(0);
            expect(result.schedule).toHaveLength(0);
        });

        it('handles a single-month tenure', () => {
            const result = calculateEmi({
                loanAmount: 100_000,
                annualRatePercent: 12,
                tenureMonths: 1,
            });

            expect(result.schedule).toHaveLength(1);
            expect(result.schedule[0]!.closingBalance).toBe(0);
            expect(result.totalInterest).toBeCloseTo(1_000, 2);
        });
    });
});

describe('estimateEligibility', () => {
    it('rates a strong co-applicant income as eligible for the full fee', () => {
        const result = estimateEligibility({
            courseFee: 500_000,
            coApplicantMonthlyIncome: 120_000,
            isCollateralAvailable: false,
            courseType: 'domestic',
            cibilBand: 'excellent',
        });

        expect(result.maxEligibleAmount).toBeGreaterThanOrEqual(500_000);
        expect(result.band).toBe('strong');
        expect(result.affordableEmi).toBe(60_000);
        expect(result.notes.length).toBeGreaterThan(0);
    });

    it('returns zero eligibility when there is no serviceable income', () => {
        const result = estimateEligibility({
            courseFee: 400_000,
            coApplicantMonthlyIncome: 0,
            isCollateralAvailable: false,
            courseType: 'domestic',
            cibilBand: 'unknown',
        });

        expect(result.maxEligibleAmount).toBe(0);
        expect(result.affordableEmi).toBe(0);
        expect(result.band).toBe('weak');
        expect(result.notes.join(' ')).toContain('exceeds the indicative eligibility');
    });

    it('existing EMIs reduce the serviceable amount and add a note', () => {
        const base = {
            // Income kept low enough that the serviceable amount, not the
            // collateral-free ceiling, is the binding constraint.
            courseFee: 900_000,
            coApplicantMonthlyIncome: 12_000,
            isCollateralAvailable: false,
            courseType: 'domestic' as const,
            cibilBand: 'good' as const,
        };
        const clean = estimateEligibility(base);
        const burdened = estimateEligibility({ ...base, existingMonthlyEmi: 2_000 });

        expect(burdened.maxEligibleAmount).toBeLessThan(clean.maxEligibleAmount);
        expect(burdened.notes.join(' ')).toContain('Existing EMIs');
    });

    it('collateral lifts the ceiling to about 75% of the assessed value', () => {
        const result = estimateEligibility({
            courseFee: 2_000_000,
            coApplicantMonthlyIncome: 400_000,
            isCollateralAvailable: true,
            collateralValue: 8_000_000,
            courseType: 'domestic',
            cibilBand: 'excellent',
        });

        expect(result.maxEligibleAmount).toBeGreaterThan(750_000);
        expect(result.notes.join(' ')).toContain('Collateral increases the sanction ceiling');
    });

    it('a weaker CIBIL band never increases the eligible amount', () => {
        const base = {
            courseFee: 700_000,
            coApplicantMonthlyIncome: 90_000,
            isCollateralAvailable: false,
            courseType: 'abroad' as const,
        };

        const excellent = estimateEligibility({ ...base, cibilBand: 'excellent' });
        const good = estimateEligibility({ ...base, cibilBand: 'good' });
        const average = estimateEligibility({ ...base, cibilBand: 'average' });

        expect(good.maxEligibleAmount).toBeLessThanOrEqual(excellent.maxEligibleAmount);
        expect(average.maxEligibleAmount).toBeLessThanOrEqual(good.maxEligibleAmount);
    });

    it('never recommends more than 110% of the course fee', () => {
        const result = estimateEligibility({
            courseFee: 300_000,
            coApplicantMonthlyIncome: 200_000,
            isCollateralAvailable: false,
            courseType: 'domestic',
            cibilBand: 'excellent',
        });

        expect(result.recommendedAmount).toBeLessThanOrEqual(Math.ceil(300_000 * 1.1));
    });
});
