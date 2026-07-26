'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, Upload } from 'lucide-react';
import {
    datasetStateAction,
    deleteDatasetAction,
    importCutoffDatasetAction,
    validateCutoffImportAction,
    type ImportPreview,
} from '@/actions/admin/cutoff.actions';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/primitives';
import { OPTIONAL_CUTOFF_COLUMNS, REQUIRED_CUTOFF_COLUMNS } from '@/schemas/predictor.schema';
import { formatDate } from '@/lib/utils';

export interface DatasetRow {
    id: string;
    predictorName: string;
    name: string;
    version: number;
    year: number;
    state: string;
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    publishedAt?: string;
    createdAt: string;
}

/** Minimal, dependency-free CSV parser (handles quoted values and commas). */
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const splitLine = (line: string): string[] => {
        const out: string[] = [];
        let current = '';
        let quoted = false;
        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            if (char === '"') {
                if (quoted && line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else quoted = !quoted;
            } else if (char === ',' && !quoted) {
                out.push(current.trim());
                current = '';
            } else current += char;
        }
        out.push(current.trim());
        return out;
    };

    const headers = splitLine(lines[0]!);
    const rows = lines.slice(1).map((line) => {
        const values = splitLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });

    return { headers, rows };
}

const ALL_COLUMNS = [...REQUIRED_CUTOFF_COLUMNS, ...OPTIONAL_CUTOFF_COLUMNS];

export function CutoffImport({
    predictors,
    datasets,
}: {
    predictors: { label: string; value: string }[];
    datasets: DatasetRow[];
}) {
    const router = useRouter();
    const [predictorId, setPredictorId] = useState(predictors[0]?.value ?? '');
    const [name, setName] = useState('');
    const [year, setYear] = useState(new Date().getFullYear() - 1);
    const [sourceNote, setSourceNote] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [pending, startTransition] = useTransition();

    const onFile = async (file: File) => {
        setError(null);
        setPreview(null);
        const text = await file.text();
        const parsed = parseCsv(text);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        if (!name) setName(`${file.name.replace(/\.csv$/i, '')} import`);

        // Auto-map columns whose header resembles a known field.
        const auto: Record<string, string> = {};
        ALL_COLUMNS.forEach((column) => {
            const match = parsed.headers.find(
                (header) => header.toLowerCase().replace(/[^a-z]/g, '') === column.toLowerCase().replace(/[^a-z]/g, ''),
            );
            if (match) auto[column] = match;
        });
        setMapping(auto);
    };

    const validate = async () => {
        setBusy(true);
        setError(null);
        const result = await validateCutoffImportAction({
            predictorId,
            year,
            name: name || 'Imported dataset',
            sourceNote,
            columnMapping: mapping,
            rows,
        });
        setBusy(false);
        if (result.ok) setPreview(result.data);
        else setError(result.error);
    };

    const commit = async () => {
        setBusy(true);
        setError(null);
        const result = await importCutoffDatasetAction({
            predictorId,
            year,
            name: name || 'Imported dataset',
            sourceNote,
            columnMapping: mapping,
            rows,
        });
        setBusy(false);
        if (result.ok) {
            setMessage(result.message ?? 'Imported.');
            setPreview(null);
            setRows([]);
            setHeaders([]);
            router.refresh();
        } else setError(result.error);
    };

    const changeState = (datasetId: string, action: 'publish' | 'rollback' | 'archive') =>
        startTransition(async () => {
            const result = await datasetStateAction({ datasetId, action });
            setMessage(result.ok ? (result.message ?? 'Updated.') : result.error);
            router.refresh();
        });

    const removeDataset = (datasetId: string) =>
        startTransition(async () => {
            if (!window.confirm('Delete this dataset and all of its cut-off rows?')) return;
            const result = await deleteDatasetAction({ datasetId });
            setMessage(result.ok ? (result.message ?? 'Deleted.') : result.error);
            router.refresh();
        });

    return (
        <div className="space-y-4">
            <section className="rounded-panel border border-line bg-white p-4 shadow-card">
                <h2 className="mb-3 text-[14px] font-extrabold text-navy-800">Import a cut-off dataset</h2>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Predictor" htmlFor="ci-predictor" required>
                        <Select
                            id="ci-predictor"
                            options={predictors}
                            value={predictorId}
                            onChange={(e) => setPredictorId(e.target.value)}
                        />
                    </Field>
                    <Field label="Dataset name" htmlFor="ci-name" required>
                        <Input id="ci-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Field label="Data year" htmlFor="ci-year" required>
                        <Input id="ci-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                    </Field>
                    <Field label="Source note" htmlFor="ci-source" hint="Where this data came from">
                        <Input id="ci-source" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} />
                    </Field>
                </div>

                <Field
                    label="CSV file"
                    htmlFor="ci-file"
                    className="mt-3"
                    hint="Header row required. Columns are mapped below after upload."
                >
                    <input
                        id="ci-file"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void onFile(file);
                        }}
                        className="block w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[12.5px] file:mr-3 file:rounded-[8px] file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-[12px] file:font-bold file:text-white"
                    />
                </Field>

                {headers.length > 0 ? (
                    <>
                        <p className="mt-3 text-[12px] text-ink-soft">
                            {rows.length.toLocaleString('en-IN')} data rows detected. Map your columns:
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {ALL_COLUMNS.map((column) => (
                                <label key={column} className="text-[11.5px] font-semibold text-ink">
                                    {column}
                                    {(REQUIRED_CUTOFF_COLUMNS as readonly string[]).includes(column) ? (
                                        <span className="ml-0.5 text-red-alert">*</span>
                                    ) : null}
                                    <select
                                        value={mapping[column] ?? ''}
                                        onChange={(e) => setMapping((prev) => ({ ...prev, [column]: e.target.value }))}
                                        className="mt-1 h-9 w-full rounded-[8px] border border-line bg-white px-2 text-[12px] font-normal outline-none focus:border-navy-300"
                                    >
                                        <option value="">— not mapped —</option>
                                        {headers.map((header) => (
                                            <option key={header} value={header}>
                                                {header}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="navy" size="sm" onClick={validate} loading={busy}>
                                Validate rows
                            </Button>
                            {preview && preview.validRows > 0 ? (
                                <Button variant="primary" size="sm" onClick={commit} loading={busy}>
                                    <Upload className="h-3.5 w-3.5" aria-hidden />
                                    Import {preview.validRows.toLocaleString('en-IN')} rows
                                </Button>
                            ) : null}
                        </div>
                    </>
                ) : null}

                {error ? (
                    <p role="alert" className="mt-3 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2 text-[12.5px] font-semibold text-red-alert">
                        {error}
                    </p>
                ) : null}
                {message ? (
                    <p role="status" className="mt-3 flex items-center gap-2 rounded-[10px] border border-green/30 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {message}
                    </p>
                ) : null}
            </section>

            {preview ? (
                <section className="rounded-panel border border-line bg-white p-4 shadow-card">
                    <h2 className="mb-3 text-[14px] font-extrabold text-navy-800">Validation preview</h2>

                    <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone="green" size="lg">{preview.validRows} valid</Badge>
                        <Badge tone={preview.invalidRows > 0 ? 'red' : 'neutral'} size="lg">
                            {preview.invalidRows} invalid
                        </Badge>
                        <Badge tone="neutral" size="lg">{preview.totalRows} total</Badge>
                    </div>

                    {preview.unmatchedColleges.length > 0 ? (
                        <p className="mb-3 flex items-start gap-2 rounded-[10px] border border-orange-100 bg-orange-50 px-3 py-2 text-[11.5px] text-orange-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>
                                These college names do not match an existing college record, so predictions will show the name
                                without a link: {preview.unmatchedColleges.join(', ')}
                            </span>
                        </p>
                    ) : null}

                    {preview.sample.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11.5px]">
                                <thead>
                                    <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft">
                                        {Object.keys(preview.sample[0]!).map((key) => (
                                            <th key={key} className="py-2 pr-3">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.sample.map((row, index) => (
                                        <tr key={index} className="border-b border-line/60 last:border-0">
                                            {Object.values(row).map((value, cellIndex) => (
                                                <td key={cellIndex} className="py-1.5 pr-3 text-ink">
                                                    {String(value)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}

                    {preview.issues.length > 0 ? (
                        <details className="mt-3">
                            <summary className="cursor-pointer text-[12px] font-bold text-red-alert">
                                {preview.issues.length} issue(s) found
                            </summary>
                            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[11.5px] text-ink-soft">
                                {preview.issues.map((issue, index) => (
                                    <li key={index}>
                                        Row {issue.row}: {issue.message}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ) : null}
                </section>
            ) : null}

            <section className="rounded-panel border border-line bg-white shadow-card">
                <div className="flex items-center gap-2 border-b border-line p-3">
                    <h2 className="text-[14px] font-extrabold text-navy-800">Dataset versions</h2>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin text-ink-soft" aria-hidden /> : null}
                </div>

                {datasets.length === 0 ? (
                    <p className="p-6 text-center text-[13px] text-ink-soft">No datasets imported yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[12px]">
                            <thead>
                                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-soft">
                                    <th className="px-3 py-2.5">Predictor</th>
                                    <th className="px-3 py-2.5">Dataset</th>
                                    <th className="px-3 py-2.5">Version</th>
                                    <th className="px-3 py-2.5">Year</th>
                                    <th className="px-3 py-2.5">Rows</th>
                                    <th className="px-3 py-2.5">State</th>
                                    <th className="px-3 py-2.5">Published</th>
                                    <th className="px-3 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datasets.map((dataset) => (
                                    <tr key={dataset.id} className="border-b border-line/70 last:border-0">
                                        <td className="px-3 py-2.5 font-semibold text-ink">{dataset.predictorName}</td>
                                        <td className="px-3 py-2.5 text-ink-soft">{dataset.name}</td>
                                        <td className="px-3 py-2.5 text-ink">v{dataset.version}</td>
                                        <td className="px-3 py-2.5 text-ink-soft">{dataset.year}</td>
                                        <td className="px-3 py-2.5 text-ink-soft">
                                            {dataset.validRowCount.toLocaleString('en-IN')}
                                            {dataset.invalidRowCount > 0 ? (
                                                <span className="text-red-alert"> (+{dataset.invalidRowCount} skipped)</span>
                                            ) : null}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Badge
                                                tone={
                                                    dataset.state === 'published'
                                                        ? 'green'
                                                        : dataset.state === 'validated'
                                                            ? 'amber'
                                                            : 'neutral'
                                                }
                                            >
                                                {dataset.state.replace(/_/g, ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2.5 text-ink-soft">
                                            {dataset.publishedAt ? formatDate(dataset.publishedAt) : '—'}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="flex justify-end gap-1.5">
                                                {dataset.state !== 'published' ? (
                                                    <Button variant="primary" size="xs" onClick={() => changeState(dataset.id, 'publish')}>
                                                        Publish
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" size="xs" onClick={() => changeState(dataset.id, 'rollback')}>
                                                        Roll back
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="xs" onClick={() => changeState(dataset.id, 'archive')}>
                                                    Archive
                                                </Button>
                                                <Button variant="ghost" size="xs" onClick={() => removeDataset(dataset.id)}>
                                                    Delete
                                                </Button>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
