import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CtaBanner, DataNotice, FaqAccordion, KeyValueGrid, RichText, SectionCard } from '@/components/shared/content-blocks';
import { CollegeCard, toCollegeCard } from '@/components/colleges/college-card';
import { Badge, RatingStars } from '@/components/ui/primitives';
import { getCollegeDetail } from '@/services/college.service';
import { formatCompactINR, formatDate } from '@/lib/utils';

export default async function CollegeOverviewPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();

    const { college, courses, reviews, similar, rankings } = detail;

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
                <SectionCard id="overview" title={`About ${college.shortName ?? college.name}`} icon="Building2">
                    <KeyValueGrid
                        columns={4}
                        className="mb-4"
                        items={[
                            { label: 'Ownership', value: college.ownership },
                            { label: 'Established', value: college.establishedYear ?? '—' },
                            { label: 'Affiliation', value: college.affiliatedTo ?? '—' },
                            { label: 'Campus size', value: college.campusSizeAcres ? `${college.campusSizeAcres} acres` : '—' },
                            { label: 'Approvals', value: college.approvals?.join(', ') || '—' },
                            { label: 'Accreditation', value: college.accreditation?.join(', ') || '—' },
                            { label: 'Students', value: college.totalStudents?.toLocaleString('en-IN') ?? '—' },
                            { label: 'Faculty ratio', value: college.facultyStudentRatio ?? '—' },
                        ]}
                    />
                    <RichText html={college.overviewHtml} />
                </SectionCard>

                <SectionCard
                    id="courses"
                    title="Courses offered"
                    icon="GraduationCap"
                    description={`${courses.length} programmes with indicative fees`}
                    actions={
                        <Link href={`/colleges/${college.slug}/courses`} className="link-more">
                            View all →
                        </Link>
                    }
                >
                    {courses.length === 0 ? (
                        <p className="text-[13px] text-ink-soft">Course details are being updated.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12.5px]">
                                <thead>
                                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                        <th className="py-2 pr-3">Course</th>
                                        <th className="py-2 pr-3">Level</th>
                                        <th className="py-2 pr-3">Duration</th>
                                        <th className="py-2 pr-3">Seats</th>
                                        <th className="py-2">Annual fee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.slice(0, 8).map((row) => (
                                        <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                            <td className="py-2.5 pr-3 font-semibold text-ink">{row.courseName}</td>
                                            <td className="py-2.5 pr-3 text-ink-soft">{row.level}</td>
                                            <td className="py-2.5 pr-3 text-ink-soft">{row.durationLabel}</td>
                                            <td className="py-2.5 pr-3 text-ink-soft">{row.totalSeats ?? '—'}</td>
                                            <td className="py-2.5 font-bold text-ink">{formatCompactINR(row.annualFee)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <SectionCard id="admissions" title="Admission process" icon="Route">
                    <RichText html={college.admissionsHtml} />
                    {college.examsAccepted?.length ? (
                        <div className="mt-3">
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                                Exams accepted
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {(college.examsAccepted as unknown as { _id: string; shortName: string; slug: string }[]).map(
                                    (exam) => (
                                        <Link key={String(exam._id)} href={`/exams/${exam.slug}`} className="chip">
                                            {exam.shortName}
                                        </Link>
                                    ),
                                )}
                            </div>
                        </div>
                    ) : null}
                </SectionCard>

                <SectionCard id="placements" title="Placements" icon="TrendingUp">
                    <KeyValueGrid
                        columns={4}
                        className="mb-3"
                        items={[
                            { label: 'Highest package', value: formatCompactINR(college.placement?.highestPackage) },
                            { label: 'Average package', value: formatCompactINR(college.placement?.averagePackage) },
                            { label: 'Median package', value: formatCompactINR(college.placement?.medianPackage) },
                            {
                                label: 'Placement rate',
                                value: college.placement?.placementPercentage
                                    ? `${college.placement.placementPercentage}%`
                                    : '—',
                            },
                        ]}
                    />
                    <RichText html={college.placement?.summaryHtml} />
                    {college.placement?.topRecruiters?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {college.placement.topRecruiters.map((recruiter) => (
                                <Badge key={recruiter} tone="neutral" size="lg">
                                    {recruiter}
                                </Badge>
                            ))}
                        </div>
                    ) : null}
                </SectionCard>

                {rankings.length > 0 ? (
                    <SectionCard id="rankings" title="Rankings" icon="Trophy">
                        <table className="w-full text-left text-[12.5px]">
                            <thead>
                                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-soft">
                                    <th className="py-2 pr-3">Publisher</th>
                                    <th className="py-2 pr-3">Category</th>
                                    <th className="py-2 pr-3">Year</th>
                                    <th className="py-2">Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankings.map((row) => (
                                    <tr key={String(row._id)} className="border-b border-line/70 last:border-0">
                                        <td className="py-2.5 pr-3 text-ink">{row.publisher}</td>
                                        <td className="py-2.5 pr-3 text-ink-soft">{row.categoryName}</td>
                                        <td className="py-2.5 pr-3 text-ink-soft">{row.year}</td>
                                        <td className="py-2.5 font-bold text-ink">#{row.rank}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </SectionCard>
                ) : null}

                <SectionCard id="facilities" title="Campus facilities" icon="Building2">
                    {college.facilities?.length ? (
                        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {college.facilities.map((facility) => (
                                <li
                                    key={facility}
                                    className="rounded-[9px] border border-line bg-muted/50 px-2.5 py-2 text-[12px] font-semibold text-ink"
                                >
                                    {facility}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-ink-soft">Facility details are being updated.</p>
                    )}
                </SectionCard>

                <SectionCard
                    id="reviews"
                    title="Student reviews"
                    icon="Star"
                    description={`${college.rating?.count ?? 0} verified reviews`}
                    actions={
                        <Link href={`/colleges/${college.slug}/reviews`} className="link-more">
                            All reviews →
                        </Link>
                    }
                >
                    {reviews.items.length === 0 ? (
                        <p className="text-[13px] text-ink-soft">
                            No reviews published yet.{' '}
                            <Link href={`/colleges/${college.slug}/reviews`} className="font-semibold text-orange">
                                Be the first to write one
                            </Link>
                            .
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {reviews.items.slice(0, 3).map((review) => (
                                <li key={String(review._id)} className="rounded-[12px] border border-line p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-[13px] font-bold text-ink">{review.title}</p>
                                        <RatingStars value={review.ratings.overall} showValue />
                                    </div>
                                    <p className="mt-1.5 line-clamp-3 text-[12.5px] text-ink-soft">{review.reviewText}</p>
                                    <p className="mt-2 text-[11px] text-ink-soft">
                                        {review.isAnonymous ? 'Anonymous student' : review.authorName}
                                        {review.passingYear ? ` • Batch of ${review.passingYear}` : ''} •{' '}
                                        {formatDate(review.createdAt)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                {college.faqs?.length ? (
                    <SectionCard id="faqs" title="Frequently asked questions" icon="CircleHelp">
                        <FaqAccordion faqs={college.faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
                    </SectionCard>
                ) : null}

                <CtaBanner
                    title="Not sure if this college fits your profile?"
                    description="Talk to a counsellor for a free shortlist review based on your score, budget and location."
                    ctaLabel="Book free counselling"
                    ctaUrl={`/book-counselling?college=${college.slug}`}
                />
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
                <SectionCard title="Quick facts" icon="Info">
                    <KeyValueGrid
                        columns={2}
                        items={[
                            { label: 'Annual fee (from)', value: formatCompactINR(college.feeRange?.min) },
                            { label: 'Annual fee (up to)', value: formatCompactINR(college.feeRange?.max) },
                            { label: 'Hostel', value: college.hostelAvailable ? 'Available' : 'Not available' },
                            {
                                label: 'Hostel fee',
                                value: college.hostelFeeRange?.min ? formatCompactINR(college.hostelFeeRange.min) : '—',
                            },
                        ]}
                    />
                    <DataNotice className="mt-3" note={college.dataSourceNote} />
                </SectionCard>

                <SectionCard title="Contact" icon="Phone">
                    <ul className="space-y-2 text-[12.5px]">
                        {college.contact?.phone ? (
                            <li>
                                <a href={`tel:${college.contact.phone}`} className="font-semibold text-navy-700">
                                    {college.contact.phone}
                                </a>
                            </li>
                        ) : null}
                        {college.contact?.email ? (
                            <li className="break-all">
                                <a href={`mailto:${college.contact.email}`} className="text-ink-soft hover:text-navy-700">
                                    {college.contact.email}
                                </a>
                            </li>
                        ) : null}
                        {college.address ? <li className="text-ink-soft">{college.address}</li> : null}
                    </ul>
                </SectionCard>

                {similar.length > 0 ? (
                    <SectionCard title="Similar colleges" icon="GitCompare">
                        <ul className="space-y-2">
                            {similar.slice(0, 5).map((item) => (
                                <li key={String(item._id)}>
                                    <Link
                                        href={`/colleges/${item.slug}`}
                                        className="block rounded-[10px] border border-line px-3 py-2 transition-colors hover:border-navy-200 hover:bg-muted/60"
                                    >
                                        <span className="block truncate text-[12.5px] font-bold text-ink">{item.name}</span>
                                        <span className="mt-0.5 block text-[11px] text-ink-soft">
                                            {item.cityName}, {item.stateName} • {formatCompactINR(item.feeRange?.min)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                ) : null}
            </aside>
        </div>
    );
}
