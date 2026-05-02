import { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import {
    POST_TEMPLATES,
    TEMPLATE_CATEGORIES,
    type PostTemplate,
    type TemplateCategory,
} from '../data/postTemplates';
import { TemplateCustomizeModal } from '../components/templates/TemplateCustomizeModal';
import { Pagination } from '../components/common/Pagination';
import { cn } from '../lib/utils';

const PAGE_SIZE = 6;

function extractPlaceholders(body: string): readonly string[] {
    const matches = [...body.matchAll(/\{\{(\w+)\}\}/g)];
    return [...new Set(matches.map((m) => m[1]))];
}

// ─── CreateTemplateModal ──────────────────────────────────────────────────────

function CreateTemplateModal({
    open,
    onClose,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (t: PostTemplate) => void;
}) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState('');

    const detectedPlaceholders = useMemo(() => extractPlaceholders(body), [body]);

    function handleSave() {
        if (!title.trim()) { setError('Dê um nome ao template.'); return; }
        if (!body.trim()) { setError('O corpo do template não pode ser vazio.'); return; }
        onSave({
            id: `custom-${Date.now()}`,
            category: 'launch',
            title: title.trim(),
            previewText: 'Template personalizado',
            bodyTemplate: body.trim(),
            platform: 'AMBOS',
            placeholders: detectedPlaceholders,
        });
        setTitle('');
        setBody('');
        setError('');
        onClose();
    }

    function handleClose() {
        setTitle('');
        setBody('');
        setError('');
        onClose();
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(14,15,12,0.5)] backdrop-blur-sm">
            <div className="app-panel rounded-[30px] w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-black app-text" style={{ fontSize: '1.4rem', lineHeight: 0.9 }}>
                        Criar Template
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full text-[#868685] hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6] hover:bg-[rgba(14,15,12,0.06)] dark:hover:bg-white/8 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold app-text-secondary mb-1.5">
                            Nome do Template
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Promoção Relâmpago"
                            className="app-input text-sm px-3 py-2 rounded-[10px]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold app-text-secondary mb-1.5">
                            Corpo do Template
                            <span className="ml-2 app-text-soft font-normal">use {'{{nome}}'} para criar campos</span>
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={'Olá {{nome_cliente}}!\n\nTemos uma oferta exclusiva de {{descricao_oferta}}.\n\nAproveite: {{link_ou_cta}}'}
                            rows={6}
                            className="app-input text-sm font-mono resize-none px-3 py-2 rounded-[10px]"
                        />
                    </div>

                    {detectedPlaceholders.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold app-text-secondary mb-1.5">
                                Campos detectados
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {detectedPlaceholders.map((p) => (
                                    <span
                                        key={p}
                                        className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-800"
                                    >
                                        {`{{${p}}}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-rose-500 font-semibold">{error}</p>
                    )}
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-2 rounded-full text-sm font-semibold bg-[rgba(14,15,12,0.06)] dark:bg-white/8 text-[#454745] dark:text-[#868685] hover:bg-[rgba(14,15,12,0.10)] dark:hover:bg-white/12 transition-all hover:scale-105 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-2 rounded-full text-sm font-semibold bg-primary-400 text-primary-900 hover:scale-105 active:scale-95 transition-all"
                    >
                        Salvar Template
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── TemplateCard ────────────────────────────────────────────────────────────

function TemplateCard({
    template,
    onSelect,
}: {
    template: PostTemplate;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="group flex flex-col app-panel rounded-[30px] p-5 hover:border-primary-200 dark:hover:border-primary-700/40 transition-all duration-200">
            <h3 className="font-bold app-text text-sm mb-1.5 leading-snug">
                {template.title}
            </h3>
            <p className="text-xs app-text-soft leading-relaxed flex-1 mb-4">
                {template.previewText}
            </p>

            {template.placeholders.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {template.placeholders.slice(0, 4).map((p) => (
                        <span
                            key={p}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-800"
                        >
                            {`{{${p}}}`}
                        </span>
                    ))}
                    {template.placeholders.length > 4 && (
                        <span className="text-[10px] app-text-soft self-center">
                            +{template.placeholders.length - 4}
                        </span>
                    )}
                </div>
            )}

            <button
                onClick={() => onSelect(template.id)}
                className="w-full py-2 rounded-full text-sm font-semibold bg-primary-400 text-primary-900 hover:scale-105 active:scale-95 transition-all duration-150"
            >
                Usar Template
            </button>
        </div>
    );
}

// ─── TemplatesPage ────────────────────────────────────────────────────────────

export function TemplatesPage() {
    const [activeCategory, setActiveCategory] = useState<TemplateCategory | null>(null);
    const [page, setPage] = useState(0);
    const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
    const [customTemplates, setCustomTemplates] = useState<PostTemplate[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const allTemplates = useMemo(
        () => [...POST_TEMPLATES, ...customTemplates],
        [customTemplates],
    );

    const filtered = useMemo(
        () => activeCategory ? allTemplates.filter((t) => t.category === activeCategory) : allTemplates,
        [allTemplates, activeCategory],
    );

    const paginated = useMemo(
        () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [filtered, page],
    );

    function handleCategoryToggle(cat: TemplateCategory) {
        setActiveCategory((prev) => (prev === cat ? null : cat));
        setPage(0);
    }

    function handleSelectTemplate(id: string) {
        const found = allTemplates.find((t) => t.id === id) ?? null;
        setSelectedTemplate(found);
    }

    function handleSaveCustom(t: PostTemplate) {
        setCustomTemplates((prev) => [...prev, t]);
    }

    return (
        <div className="pt-2 pb-8">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1
                        className="font-black app-text tracking-tight"
                        style={{ fontSize: '2.2rem', lineHeight: 0.9 }}
                    >
                        Biblioteca de Templates
                    </h1>
                    <p className="app-text-soft mt-2 text-sm font-semibold">
                        Escolha um template, preencha os campos e gere sua campanha em segundos.
                    </p>
                </div>

                <button
                    onClick={() => setCreateOpen(true)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary-400 text-primary-900 hover:scale-105 active:scale-95 transition-all duration-150"
                >
                    <Plus size={15} />
                    Criar Template
                </button>
            </div>

            {/* Category tabs — click novamente para ver todos */}
            <div className="flex gap-2 flex-wrap mb-8">
                {TEMPLATE_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = cat.id === activeCategory;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryToggle(cat.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                                isActive
                                    ? 'bg-primary-400 text-primary-900 hover:scale-105 active:scale-95'
                                    : 'app-panel-subtle app-text-secondary hover:bg-[var(--app-hover-strong)] dark:hover:bg-white/12',
                            )}
                        >
                            <Icon size={15} />
                            {cat.label}
                        </button>
                    );
                })}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map((template) => (
                    <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleSelectTemplate}
                    />
                ))}
            </div>

            <Pagination
                page={page}
                total={filtered.length}
                limit={PAGE_SIZE}
                onPageChange={setPage}
            />

            <TemplateCustomizeModal
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
            />

            <CreateTemplateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSave={handleSaveCustom}
            />
        </div>
    );
}
