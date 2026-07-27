'use client';

import * as React from 'react';
import {
    Bold,
    Code2,
    Italic,
    Link2,
    Link2Off,
    List,
    ListOrdered,
    Quote,
    Redo2,
    RemoveFormatting,
    Underline,
    Undo2,
} from 'lucide-react';
import { cleanPastedHtml, normaliseEditorHtml, plainTextToHtml } from '@/lib/html/clean-client';
import { isSafeUrl } from '@/lib/html/policy';
import { cn } from '@/lib/utils';

/**
 * WYSIWYG editor for admin rich-text fields.
 *
 * Replaces the raw-HTML textarea the admin console used to show. Content editors
 * are not expected to know HTML, but the *stored* format is still HTML because
 * the public site renders it through `.prose-sathi` — so the editor body carries
 * that same class and what an editor sees is what the page will look like.
 *
 * Three deliberate decisions:
 *
 * 1. **The DOM is the source of truth while focused.** Re-writing `innerHTML` on
 *    every keystroke from React state would reset the caret to the start of the
 *    field, so incoming `value` is only applied when it differs from what this
 *    component last emitted.
 * 2. **Paste is intercepted.** Pasting from Word or Google Docs is the normal way
 *    this content arrives, and it carries a wall of `<span style>` and
 *    `class="MsoNormal"`. `cleanPastedHtml` reduces it to the shared allow-list.
 * 3. **The HTML source view is kept.** Removing it would take a capability away
 *    from whoever is comfortable with markup; it is a toggle, not the default.
 *
 * `document.execCommand` is formally deprecated but is still the only editing API
 * implemented across every browser. The server sanitiser is what guarantees the
 * stored result regardless of what any browser's implementation emits.
 */

export interface RichTextEditorProps {
    id?: string;
    value: string;
    onChange: (html: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    invalid?: boolean;
    rows?: number;
    disabled?: boolean;
    /**
     * Accessible name for the editing surface.
     *
     * Required in practice: the surface is a `contentEditable` div, and a
     * `<label for>` only binds to real form controls — without this the field
     * would be announced as an unnamed text box.
     */
    label?: string;
    'aria-describedby'?: string;
}

type BlockFormat = 'p' | 'h2' | 'h3' | 'h4' | 'blockquote';

const BLOCK_OPTIONS: { value: BlockFormat; label: string }[] = [
    { value: 'p', label: 'Normal text' },
    { value: 'h2', label: 'Heading' },
    { value: 'h3', label: 'Sub-heading' },
    { value: 'h4', label: 'Small heading' },
    { value: 'blockquote', label: 'Quote' },
];

interface InlineAction {
    command: string;
    label: string;
    icon: typeof Bold;
    shortcut?: string;
}

const INLINE_ACTIONS: InlineAction[] = [
    { command: 'bold', label: 'Bold', icon: Bold, shortcut: '⌘B' },
    { command: 'italic', label: 'Italic', icon: Italic, shortcut: '⌘I' },
    { command: 'underline', label: 'Underline', icon: Underline, shortcut: '⌘U' },
    { command: 'insertUnorderedList', label: 'Bulleted list', icon: List },
    { command: 'insertOrderedList', label: 'Numbered list', icon: ListOrdered },
];

function exec(command: string, value?: string): void {
    document.execCommand(command, false, value);
}

function queryState(command: string): boolean {
    try {
        return document.queryCommandState(command);
    } catch {
        // Not every command reports state in every browser.
        return false;
    }
}

export function RichTextEditor({
    id,
    value,
    onChange,
    onBlur,
    placeholder = 'Start typing, or paste content from a document…',
    invalid,
    rows = 10,
    disabled,
    label,
    'aria-describedby': describedBy,
}: RichTextEditorProps) {
    const bodyRef = React.useRef<HTMLDivElement>(null);
    /**
     * What this component last wrote to, or read from, the editable node.
     *
     * `null` until the first sync so that mounting with existing content always
     * paints it — seeding this with `value` instead would make the effect below
     * a no-op on mount and show an empty editor when editing a saved record.
     */
    const lastEmitted = React.useRef<string | null>(null);
    const savedRange = React.useRef<Range | null>(null);

    const [showSource, setShowSource] = React.useState(false);
    const [linkDraft, setLinkDraft] = React.useState<string | null>(null);
    const [active, setActive] = React.useState<Record<string, boolean>>({});
    const [block, setBlock] = React.useState<BlockFormat>('p');

    /*
     * Steer what `contentEditable` emits. Without these, Enter produces `<div>`
     * and Bold produces `<span style="font-weight:bold">` — both of which the
     * server allow-list would strip, silently losing the editor's formatting.
     */
    React.useEffect(() => {
        try {
            document.execCommand('defaultParagraphSeparator', false, 'p');
            document.execCommand('styleWithCSS', false, 'false');
        } catch {
            // Older browsers reject these; the sanitiser normalises either way.
        }
    }, []);

    /* Apply an externally changed value without disturbing the caret. */
    React.useEffect(() => {
        const el = bodyRef.current;
        if (!el || showSource) return;
        if (value === lastEmitted.current) return;
        el.innerHTML = value;
        lastEmitted.current = value;
    }, [value, showSource]);

    const emit = React.useCallback(() => {
        const el = bodyRef.current;
        if (!el) return;
        const html = normaliseEditorHtml(el.innerHTML);
        lastEmitted.current = html;
        onChange(html);
    }, [onChange]);

    /* Reflect the caret's current formatting in the toolbar. */
    const syncToolbar = React.useCallback(() => {
        const el = bodyRef.current;
        if (!el || !el.contains(document.getSelection()?.anchorNode ?? null)) return;

        setActive({
            bold: queryState('bold'),
            italic: queryState('italic'),
            underline: queryState('underline'),
            insertUnorderedList: queryState('insertUnorderedList'),
            insertOrderedList: queryState('insertOrderedList'),
        });

        let node = document.getSelection()?.anchorNode ?? null;
        while (node && node !== el) {
            if (node instanceof HTMLElement) {
                const tag = node.tagName.toLowerCase();
                if (BLOCK_OPTIONS.some((option) => option.value === tag)) {
                    setBlock(tag as BlockFormat);
                    return;
                }
            }
            node = node.parentNode;
        }
        setBlock('p');
    }, []);

    React.useEffect(() => {
        document.addEventListener('selectionchange', syncToolbar);
        return () => document.removeEventListener('selectionchange', syncToolbar);
    }, [syncToolbar]);

    const runCommand = (command: string, commandValue?: string) => {
        bodyRef.current?.focus();
        exec(command, commandValue);
        syncToolbar();
        emit();
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault();
        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');

        const insert = html ? cleanPastedHtml(html) : plainTextToHtml(text);
        if (!insert) return;

        exec('insertHTML', insert);
        emit();
    };

    const openLinkEditor = () => {
        const selection = document.getSelection();
        savedRange.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

        const existing = (() => {
            let node = selection?.anchorNode ?? null;
            while (node && node !== bodyRef.current) {
                if (node instanceof HTMLAnchorElement) return node.getAttribute('href') ?? '';
                node = node.parentNode;
            }
            return '';
        })();

        setLinkDraft(existing);
    };

    const applyLink = () => {
        const href = (linkDraft ?? '').trim();
        setLinkDraft(null);
        if (!href || !isSafeUrl(href)) return;

        const selection = document.getSelection();
        if (savedRange.current && selection) {
            selection.removeAllRanges();
            selection.addRange(savedRange.current);
        }
        runCommand('createLink', href);
    };

    const editorHeight = { minHeight: `${Math.max(rows, 4) * 1.6}rem` };

    return (
        <div
            className={cn(
                'overflow-hidden rounded-[10px] border bg-white transition-colors',
                invalid ? 'border-red-alert' : 'border-line focus-within:border-navy-300',
                disabled && 'pointer-events-none opacity-60',
            )}
        >
            <div
                role="toolbar"
                aria-label="Formatting"
                aria-controls={id}
                className="flex flex-wrap items-center gap-1 border-b border-line bg-page px-2 py-1.5"
            >
                <label className="sr-only" htmlFor={`${id}-block`}>
                    Text style
                </label>
                <select
                    id={`${id}-block`}
                    value={block}
                    disabled={showSource}
                    onChange={(event) => {
                        const next = event.target.value as BlockFormat;
                        setBlock(next);
                        runCommand('formatBlock', next === 'p' ? 'p' : next);
                    }}
                    className="h-8 rounded-[7px] border border-line bg-white px-2 text-[12px] font-semibold text-ink outline-none focus:border-navy-300 disabled:opacity-50"
                >
                    {BLOCK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />

                {INLINE_ACTIONS.map((action) => (
                    <ToolbarButton
                        key={action.command}
                        label={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                        icon={action.icon}
                        pressed={active[action.command]}
                        disabled={showSource}
                        onClick={() => runCommand(action.command)}
                    />
                ))}

                <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />

                <ToolbarButton label="Quote" icon={Quote} disabled={showSource} onClick={() => runCommand('formatBlock', 'blockquote')} />
                <ToolbarButton label="Add or edit link" icon={Link2} disabled={showSource} onClick={openLinkEditor} />
                <ToolbarButton label="Remove link" icon={Link2Off} disabled={showSource} onClick={() => runCommand('unlink')} />
                <ToolbarButton label="Clear formatting" icon={RemoveFormatting} disabled={showSource} onClick={() => runCommand('removeFormat')} />

                <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />

                <ToolbarButton label="Undo" icon={Undo2} disabled={showSource} onClick={() => runCommand('undo')} />
                <ToolbarButton label="Redo" icon={Redo2} disabled={showSource} onClick={() => runCommand('redo')} />

                <ToolbarButton
                    className="ml-auto"
                    label={showSource ? 'Back to visual editor' : 'Edit HTML source'}
                    icon={Code2}
                    pressed={showSource}
                    onClick={() => {
                        // Returning to the visual editor mounts a fresh node, so the
                        // sync marker is cleared to force it to repaint. Without this
                        // the marker still equals `value` and the surface stays blank.
                        if (showSource) lastEmitted.current = null;
                        setShowSource((previous) => !previous);
                    }}
                />
            </div>

            {linkDraft !== null ? (
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-orange-50 px-2 py-2">
                    <label className="sr-only" htmlFor={`${id}-link`}>
                        Link address
                    </label>
                    <input
                        id={`${id}-link`}
                        autoFocus
                        value={linkDraft}
                        onChange={(event) => setLinkDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                applyLink();
                            }
                            if (event.key === 'Escape') setLinkDraft(null);
                        }}
                        placeholder="/colleges/iit-bombay or https://example.org"
                        className="h-8 min-w-[220px] flex-1 rounded-[7px] border border-line px-2 text-[12.5px] outline-none focus:border-navy-300"
                    />
                    <button
                        type="button"
                        onClick={applyLink}
                        className="h-8 rounded-[7px] bg-navy px-3 text-[12px] font-bold text-white"
                    >
                        Apply
                    </button>
                    <button
                        type="button"
                        onClick={() => setLinkDraft(null)}
                        className="h-8 rounded-[7px] border border-line px-3 text-[12px] font-semibold text-ink"
                    >
                        Cancel
                    </button>
                </div>
            ) : null}

            {showSource ? (
                <textarea
                    id={`${id}-source`}
                    value={value}
                    onChange={(event) => {
                        lastEmitted.current = event.target.value;
                        onChange(event.target.value);
                    }}
                    onBlur={onBlur}
                    spellCheck={false}
                    aria-label={label ? `${label} (HTML source)` : 'HTML source'}
                    className="block w-full resize-y border-0 px-3.5 py-2.5 font-mono text-[12px] text-ink outline-none"
                    style={editorHeight}
                />
            ) : (
                <>
                    <div
                        id={id}
                        ref={bodyRef}
                        contentEditable={!disabled}
                        suppressContentEditableWarning
                        role="textbox"
                        aria-multiline="true"
                        aria-label={label}
                        aria-invalid={invalid || undefined}
                        aria-describedby={describedBy}
                        data-placeholder={placeholder}
                        onInput={emit}
                        onBlur={() => {
                            emit();
                            onBlur?.();
                        }}
                        onPaste={handlePaste}
                        onKeyUp={syncToolbar}
                        onMouseUp={syncToolbar}
                        className="prose-sathi block w-full resize-y overflow-y-auto px-3.5 py-2.5 text-[13.5px] outline-none empty:before:pointer-events-none empty:before:text-ink-soft/70 empty:before:content-[attr(data-placeholder)]"
                        style={editorHeight}
                    />
                    <p className="border-t border-line bg-page px-3 py-1.5 text-[11px] text-ink-soft">
                        Formatting is kept; pasted styling from Word or Google Docs is cleaned automatically.
                    </p>
                </>
            )}
        </div>
    );
}

function ToolbarButton({
    label,
    icon: Icon,
    pressed,
    disabled,
    onClick,
    className,
}: {
    label: string;
    icon: typeof Bold;
    pressed?: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={pressed ?? undefined}
            disabled={disabled}
            // `mousedown` would move focus out of the editor and collapse the selection.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-ink-soft transition-colors hover:bg-white hover:text-navy-700 disabled:opacity-40',
                pressed && 'bg-navy text-white hover:bg-navy hover:text-white',
                className,
            )}
        >
            <Icon className="h-[15px] w-[15px]" aria-hidden />
        </button>
    );
}
