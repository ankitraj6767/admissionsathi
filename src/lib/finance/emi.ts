/** Pure EMI + amortisation maths shared by the UI, server actions and tests. */

export interface EmiInput {
    loanAmount: number;
    annualRatePercent: number;
    tenureMonths: number;
    /** Months before repayment starts. Interest accrues during this period. */
    moratoriumMonths?: number;
    processingFeePercent?: number;
    /** true = simple interest accrued during moratorium is added to principal */
    capitaliseMoratoriumInterest?: boolean;
}

export interface AmortisationRow {
    month: number;
    openingBalance: number;
    emi: number;
    interest: number;
    principal: number;
    closingBalance: number;
}

export interface EmiResult {
    emi: number;
    principal: number;
    moratoriumInterest: number;
    totalInterest: number;
    totalRepayment: number;
    processingFee: number;
    totalCost: number;
    schedule: AmortisationRow[];
    effectiveTenureMonths: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateEmi(input: EmiInput): EmiResult {
    const {
        loanAmount,
        annualRatePercent,
        tenureMonths,
        moratoriumMonths = 0,
        processingFeePercent = 0,
        capitaliseMoratoriumInterest = true,
    } = input;

    if (loanAmount <= 0 || tenureMonths <= 0) {
        return {
            emi: 0,
            principal: 0,
            moratoriumInterest: 0,
            totalInterest: 0,
            totalRepayment: 0,
            processingFee: 0,
            totalCost: 0,
            schedule: [],
            effectiveTenureMonths: 0,
        };
    }

    const monthlyRate = annualRatePercent / 12 / 100;

    // Simple interest accrued while the student is still studying.
    const moratoriumInterest = round(loanAmount * monthlyRate * moratoriumMonths);
    const principal = capitaliseMoratoriumInterest ? round(loanAmount + moratoriumInterest) : loanAmount;

    const emi =
        monthlyRate === 0
            ? round(principal / tenureMonths)
            : round(
                (principal * monthlyRate * (1 + monthlyRate) ** tenureMonths) /
                ((1 + monthlyRate) ** tenureMonths - 1),
            );

    const schedule: AmortisationRow[] = [];
    let balance = principal;
    let totalInterest = 0;

    for (let month = 1; month <= tenureMonths; month += 1) {
        const interest = round(balance * monthlyRate);
        let principalPaid = round(emi - interest);
        if (month === tenureMonths) principalPaid = round(balance);
        const closing = round(Math.max(0, balance - principalPaid));

        schedule.push({
            month,
            openingBalance: round(balance),
            emi: month === tenureMonths ? round(principalPaid + interest) : emi,
            interest,
            principal: principalPaid,
            closingBalance: closing,
        });

        totalInterest = round(totalInterest + interest);
        balance = closing;
        if (balance <= 0) break;
    }

    const processingFee = round((loanAmount * processingFeePercent) / 100);
    const totalRepayment = round(principal + totalInterest);

    return {
        emi,
        principal,
        moratoriumInterest,
        totalInterest,
        totalRepayment,
        processingFee,
        totalCost: round(totalRepayment + processingFee),
        schedule,
        effectiveTenureMonths: schedule.length + moratoriumMonths,
    };
}

export interface EligibilityInput {
    courseFee: number;
    coApplicantMonthlyIncome: number;
    existingMonthlyEmi?: number;
    collateralValue?: number;
    isCollateralAvailable: boolean;
    courseType: 'domestic' | 'abroad';
    cibilBand: 'excellent' | 'good' | 'average' | 'unknown';
}

export interface EligibilityResult {
    maxEligibleAmount: number;
    recommendedAmount: number;
    requiresCollateral: boolean;
    affordableEmi: number;
    band: 'strong' | 'moderate' | 'weak';
    notes: string[];
}

/**
 * Indicative eligibility estimate.
 * Uses a conservative FOIR (fixed obligation to income ratio) of 50% and
 * standard collateral-free ceilings. It is guidance only — lenders decide.
 */
export function estimateEligibility(input: EligibilityInput): EligibilityResult {
    const notes: string[] = [];
    const foirCap = 0.5;
    const disposable = Math.max(
        0,
        input.coApplicantMonthlyIncome * foirCap - (input.existingMonthlyEmi ?? 0),
    );

    const assumedRate = input.courseType === 'abroad' ? 11.5 : 10;
    const assumedTenure = 120;
    const monthlyRate = assumedRate / 12 / 100;

    // Reverse the EMI formula to get the serviceable principal.
    const serviceable =
        disposable > 0
            ? Math.floor(
                (disposable * ((1 + monthlyRate) ** assumedTenure - 1)) /
                (monthlyRate * (1 + monthlyRate) ** assumedTenure),
            )
            : 0;

    const collateralFreeCeiling = input.courseType === 'abroad' ? 4_000_000 : 750_000;
    let ceiling = collateralFreeCeiling;

    if (input.isCollateralAvailable && input.collateralValue) {
        ceiling = Math.max(ceiling, Math.floor(input.collateralValue * 0.75));
        notes.push('Collateral increases the sanction ceiling to about 75% of its assessed value.');
    } else {
        notes.push(
            `Without collateral most lenders cap education loans near ₹${(collateralFreeCeiling / 100000).toFixed(1)} lakh for ${input.courseType === 'abroad' ? 'overseas' : 'domestic'} programmes.`,
        );
    }

    const cibilFactor =
        input.cibilBand === 'excellent' ? 1 : input.cibilBand === 'good' ? 0.95 : input.cibilBand === 'average' ? 0.85 : 0.9;

    const maxEligibleAmount = Math.max(0, Math.floor(Math.min(serviceable, ceiling) * cibilFactor));
    const recommendedAmount = Math.min(maxEligibleAmount, Math.ceil(input.courseFee * 1.1));

    if (input.courseFee > maxEligibleAmount) {
        notes.push('The course fee exceeds the indicative eligibility. Consider collateral, a stronger co-applicant or a scholarship.');
    }
    if ((input.existingMonthlyEmi ?? 0) > 0) {
        notes.push('Existing EMIs reduce the serviceable amount because lenders cap total obligations.');
    }

    const band: EligibilityResult['band'] =
        maxEligibleAmount >= input.courseFee
            ? 'strong'
            : maxEligibleAmount >= input.courseFee * 0.6
                ? 'moderate'
                : 'weak';

    return {
        maxEligibleAmount,
        recommendedAmount,
        requiresCollateral: recommendedAmount > collateralFreeCeiling,
        affordableEmi: Math.floor(disposable),
        band,
        notes,
    };
}
