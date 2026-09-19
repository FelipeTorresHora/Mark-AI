import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { PostTemplate } from '../../data/postTemplates';
import { extractPlaceholders } from './templateUtils';

interface CreateTemplateModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (t: PostTemplate) => void;
}

export function CreateTemplateModal({ open, onClose, onSave }: CreateTemplateModalProps) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState('');

    const detectedPlaceholders = useMemo(() => extractPlaceholders(body), [body]);

    function resetForm() {
        setTitle('');
        setBody('');
        setError('');
    }

    function handleSave() {
        if (!title.trim()) {
            setError('Dê um nome ao template.');
            return;
        }
        if (!body.trim()) {
            setError('O corpo do template não pode ser vazio.');
            return;
        }
        onSave({
            id: `custom-${Date.now()}`,
            category: 'launch',
            title: title.trim(),
            previewText: 'Template personalizado criado por você.',
            bodyTemplate: body.trim(),
            platform: 'AMBOS',
            placeholders: detectedPlaceholders,
        });
        resetForm();
        onClose();
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(14,15,12,0.5)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-template-title"
        >
            <div className="app-panel rounded-[30px] w-full max-w-lg p-6 ring-1 ring-[rgba(14,15,12,0.12)]">
                <div className="flex items-center justify-between mb-6">
                    <h2
                        id="create-template-title"
                        className="font-black app-text tracking-tight"
                        style={{ fontSize: '1.5rem', lineHeight: 0.9 }}
                    >
                        Criar template
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Fechar"
                        className="p-2 rounded-full text-[#868685] hover:text-[#0e0f0c] dark:hover:text-[#e8ebe6] hover:bg-[rgba(14,15,12,0.06)] dark:hover:bg-white/8 transition-all hover:scale-105 active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold app-text-secondary mb-1.5">
                            Nome do template
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Promoção relâmpago"
                            className="app-input text-sm px-3 py-2 rounded-[10px] w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold app-text-secondary mb-1.5">
                            Corpo do template
                            <span className="ml-2 app-text-soft font-normal">
                                use {'{{nome}}'} para campos editáveis
                            </span>
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={
                                'Olá {{nome_cliente}}!\n\nTemos uma oferta exclusiva de {{descricao_oferta}}.\n\nAproveite: {{link_ou_cta}}'
                            }
                            rows={6}
                            className="app-input text-sm font-mono resize-none px-3 py-2 rounded-[10px] w-full"
                        />
                    </div>

                    {detectedPlaceholders.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold app-text-secondary mb-1.5">
                                Campos detectados
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {detectedPlaceholders.map((p) => (
                                    <span
                                        key={p}
                                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e2f6d5] text-[#163300] dark:bg-primary-900/30 dark:text-primary-300"
                                    >
                                        {`{{${p}}}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-xs text-[#d03238] font-semibold">{error}</p>}
                </div>

                <div className="flex gap-2 mt-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-[rgba(22,51,0,0.08)] text-[#0e0f0c] dark:text-[#e8ebe6] hover:scale-105 active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-primary-400 text-primary-900 hover:scale-105 active:scale-95 transition-all"
                    >
                        Salvar template
                    </button>
                </div>
            </div>
        </div>
    );
}
