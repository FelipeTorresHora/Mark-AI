import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Sparkles, X } from 'lucide-react';
import { POST_TEMPLATES, type PostTemplate } from '../data/postTemplates';
import { TemplateCustomizeModal } from '../components/templates/TemplateCustomizeModal';
import { CreateTemplateModal } from '../components/templates/CreateTemplateModal';
import { TemplateCard } from '../components/templates/TemplateCard';
import {
    TemplatesCategoryNav,
    type TemplatesCategoryFilter,
} from '../components/templates/TemplatesCategoryNav';
import { filterTemplates } from '../components/templates/templateUtils';
import { cn } from '../lib/utils';

export function TemplatesPage() {
    const [activeCategory, setActiveCategory] = useState<TemplatesCategoryFilter>('all');
    const [search, setSearch] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
    const [customTemplates, setCustomTemplates] = useState<PostTemplate[]>([]);
    const [createOpen, setCreateOpen] = useState(false);

    const allTemplates = useMemo(
        () => [...POST_TEMPLATES, ...customTemplates],
        [customTemplates],
    );

    const categoryCounts = useMemo(() => {
        const base: Record<TemplatesCategoryFilter, number> = {
            all: allTemplates.length,
            launch: 0,
            testimonial: 0,
            educational: 0,
        };
        for (const t of allTemplates) {
            base[t.category] += 1;
        }
        return base;
    }, [allTemplates]);

    const filtered = useMemo(() => {
        let list = allTemplates;
        if (activeCategory !== 'all') {
            list = list.filter((t) => t.category === activeCategory);
        }
        return filterTemplates(list, search);
    }, [allTemplates, activeCategory, search]);

    function handleCategoryChange(cat: TemplatesCategoryFilter) {
        setActiveCategory(cat);
    }

    function handleSelectTemplate(id: string) {
        const found = allTemplates.find((t) => t.id === id) ?? null;
        setSelectedTemplate(found);
    }

    function handleSaveCustom(t: PostTemplate) {
        setCustomTemplates((prev) => [...prev, t]);
        setActiveCategory('all');
    }

    return (
        <div className="pt-2 pb-10 max-w-[1400px]">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-400 mb-2">
                        Atalho opcional
                    </p>
                    <h1
                        className="font-black app-text tracking-tight"
                        style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 0.9 }}
                    >
                        Templates prontos
                    </h1>
                    <p className="app-text-secondary mt-3 text-base font-semibold leading-relaxed">
                        Escaneie, personalize em poucos campos e leve o texto para uma nova campanha — sem
                        substituir o fluxo principal por objetivo.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="shrink-0 self-start lg:self-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary-400 text-primary-900 hover:scale-105 active:scale-95 transition-all duration-150"
                >
                    <Plus size={16} />
                    Criar template
                </button>
            </div>

            <div
                className={cn(
                    'mb-8 rounded-[24px] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3',
                    'bg-[#e2f6d5]/50 dark:bg-primary-900/20 ring-1 ring-[rgba(22,51,0,0.1)]',
                )}
            >
                <div className="flex items-start gap-2 flex-1">
                    <Sparkles size={18} className="text-[#163300] dark:text-primary-400 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-[#163300] dark:text-primary-200 leading-relaxed">
                        Prefere começar do zero? Defina seu objetivo em{' '}
                        <Link
                            to="/campanhas"
                            className="underline underline-offset-2 decoration-[#9fe870] hover:opacity-80"
                        >
                            Campanhas
                        </Link>
                        . Templates aceleram quando você já sabe o formato.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <aside className="lg:w-[280px] shrink-0">
                    <TemplatesCategoryNav
                        active={activeCategory}
                        onChange={handleCategoryChange}
                        counts={categoryCounts}
                    />
                </aside>

                <div className="flex-1 min-w-0">
                    <div className="relative mb-5">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 app-text-soft pointer-events-none"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por título, descrição ou campo…"
                            aria-label="Buscar templates"
                            className={cn(
                                'w-full app-input pl-10 pr-10 py-2.5 rounded-full text-sm font-medium',
                                'ring-1 ring-[rgba(14,15,12,0.12)] focus:ring-[#9fe870]',
                            )}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Limpar busca"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[rgba(14,15,12,0.06)]"
                            >
                                <X size={16} className="app-text-soft" />
                            </button>
                        )}
                    </div>

                    <p className="text-xs font-semibold app-text-soft mb-4">
                        {filtered.length}{' '}
                        {filtered.length === 1 ? 'template encontrado' : 'templates encontrados'}
                    </p>

                    {filtered.length === 0 ? (
                        <div className="app-panel rounded-[30px] p-10 text-center ring-1 ring-[rgba(14,15,12,0.12)]">
                            <p className="font-semibold app-text mb-1">Nenhum template nesta busca</p>
                            <p className="text-sm app-text-soft mb-4">
                                Tente outra palavra ou veja todas as categorias.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setActiveCategory('all');
                                }}
                                className="px-4 py-2 rounded-full text-sm font-semibold bg-[rgba(22,51,0,0.08)] hover:scale-105 active:scale-95 transition-all"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filtered.map((template) => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onSelect={handleSelectTemplate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
