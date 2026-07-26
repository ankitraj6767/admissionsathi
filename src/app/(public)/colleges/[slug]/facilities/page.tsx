import { notFound } from 'next/navigation';
import { KeyValueGrid, RichText, SectionCard } from '@/components/shared/content-blocks';
import { getCollegeDetail } from '@/services/college.service';
import { formatCompactINR } from '@/lib/utils';

export default async function CollegeFacilitiesPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const detail = await getCollegeDetail(slug);
    if (!detail || 'redirectTo' in detail) notFound();
    const { college } = detail;

    return (
        <div className="space-y-4">
            <SectionCard title="Campus facilities" icon="Building2">
                {college.facilities?.length ? (
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {college.facilities.map((facility) => (
                            <li
                                key={facility}
                                className="rounded-[10px] border border-line bg-muted/50 px-3 py-2.5 text-[12px] font-semibold text-ink"
                            >
                                {facility}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-[13px] text-ink-soft">Facility details are being updated.</p>
                )}
            </SectionCard>

            <SectionCard title="Hostel & accommodation" icon="Home">
                <KeyValueGrid
                    columns={3}
                    items={[
                        { label: 'Hostel', value: college.hostelAvailable ? 'Available' : 'Not available' },
                        { label: 'Hostel fee (from)', value: formatCompactINR(college.hostelFeeRange?.min) },
                        { label: 'Hostel fee (up to)', value: formatCompactINR(college.hostelFeeRange?.max) },
                    ]}
                />
            </SectionCard>

            <SectionCard title="Faculty" icon="Users">
                <KeyValueGrid
                    columns={3}
                    className="mb-3"
                    items={[
                        { label: 'Total faculty', value: college.totalFaculty?.toLocaleString('en-IN') ?? '—' },
                        { label: 'Student-faculty ratio', value: college.facultyStudentRatio ?? '—' },
                        { label: 'Total students', value: college.totalStudents?.toLocaleString('en-IN') ?? '—' },
                    ]}
                />
                <RichText html={college.facultyHtml} />
            </SectionCard>

            {college.mapEmbedUrl ? (
                <SectionCard title="Location" icon="MapPin">
                    <div className="aspect-video w-full overflow-hidden rounded-[12px] border border-line">
                        <iframe
                            src={college.mapEmbedUrl}
                            title={`${college.name} location map`}
                            loading="lazy"
                            className="h-full w-full"
                        />
                    </div>
                </SectionCard>
            ) : (
                <SectionCard title="Location" icon="MapPin">
                    <p className="text-[13px] text-ink-soft">{college.address ?? `${college.cityName}, ${college.stateName}`}</p>
                </SectionCard>
            )}
        </div>
    );
}
