import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSSE } from '../hooks/useSSE';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { cn } from '../lib/utils';
import { CheckCircle, Loader2, XCircle, ArrowRight } from 'lucide-react';
import type { Platform } from '../types';

const PLATFORM_LABELS: Record<Platform, string> = {
    X: 'Twitter / X',
    LINKEDIN: 'LinkedIn',
};

const PLATFORM_ORDER: Platform[] = ['X', 'LINKEDIN'];

function PlatformCard({
    platform,
    status,
    done,
    total,
    errors,
}: {
    platform: Platform;
    status: string;
    done: number;
    total: number;
    errors: number;
}) {
    const progressText = total > 0 ? `${done}/${total} concluídos` : 'Aguardando lote';

    return (
        <Card className="p-5 flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full app-panel-subtle flex items-center justify-center mb-3">
                {status === 'writing' && <Loader2 size={24} className="animate-spin text-primary-600" />}
                {status === 'done' && <CheckCircle size={24} className="text-emerald-500" />}
                {status === 'error' && <XCircle size={24} className="text-rose-500" />}
                {status === 'idle' && <div className="w-5 h-5 rounded-full bg-[var(--app-text-soft)]/50" />}
            </div>
            <h3 className="font-bold app-text">{PLATFORM_LABELS[platform]}</h3>
            <p className="text-sm app-text-muted mt-2">{progressText}</p>
            {errors > 0 && (
                <p className="text-xs text-rose-500 mt-1">{errors} com erro</p>
            )}
            <p className={cn('text-xs font-semibold mt-2 px-3 py-1 rounded-full', {
                'app-chip app-chip-neutral': status === 'idle',
                'app-chip app-chip-info': status === 'writing',
                'app-chip app-chip-success': status === 'done',
                'app-chip app-chip-danger': status === 'error',
            })}>
                {status === 'idle' && 'Aguardando'}
                {status === 'writing' && 'Escrevendo...'}
                {status === 'done' && 'Concluído ✓'}
                {status === 'error' && 'Concluído com erro'}
            </p>
        </Card>
    );
}

export function GenerationPage() {
    const { campaignId } = useParams<{ campaignId: string }>();
    const navigate = useNavigate();

    const accessToken = useAppStore((s) => s.accessToken);
    const sseEndpoint =
        campaignId && accessToken
            ? `${api.defaults.baseURL}/api/v1/generate/${campaignId}/stream?token=${encodeURIComponent(accessToken)}`
            : null;

    const { platformStatus, platformProgress, events, isComplete, isConnected, error } = useSSE(sseEndpoint);

    useEffect(() => {
        if (isComplete) {
            setTimeout(() => navigate(`/campanhas/${campaignId}`), 1000);
        }
    }, [isComplete, campaignId, navigate]);

    const logLines = events.map((e, i) => {
        if (e.event === 'writer_start') {
            return { key: i, text: `[${e.platform} ${e.data.variant_index}/${e.data.platform_total}] Iniciando geração...` };
        }
        if (e.event === 'writer_done') {
            return { key: i, text: `[${e.platform} ${e.data.variant_index}/${e.data.platform_total}] Post gerado com sucesso ✓` };
        }
        if (e.event === 'generation_complete') {
            return { key: i, text: 'Geração concluída! Redirecionando...' };
        }
        if (e.event === 'error') {
            const prefix = e.platform && e.data.variant_index && e.data.platform_total
                ? `[${e.platform} ${e.data.variant_index}/${e.data.platform_total}]`
                : `[${e.platform || 'sistema'}]`;
            return { key: i, text: `${prefix} Erro: ${e.data.message}` };
        }
        return { key: i, text: '' };
    }).filter(line => line.text);

    return (
        <div className="max-w-3xl mx-auto py-12 flex flex-col items-center w-full">
            <div className="text-center mb-10">
                <div className="mx-auto w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-4 relative">
                    {isComplete ? (
                        <CheckCircle size={36} className="text-emerald-500" />
                    ) : (
                        <Loader2 size={36} className="text-primary-600 animate-spin" />
                    )}
                    {isConnected && !isComplete && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-extrabold app-text">
                    {isComplete ? 'Posts Prontos!' : 'Gerando Conteúdo...'}
                </h1>
                <p className="app-text-muted mt-2">
                    {isComplete
                        ? 'Redirecionando para revisão...'
                        : 'Os agentes estão trabalhando em tempo real.'}
                </p>
            </div>

            <div className="flex gap-4 w-full mb-8">
                {PLATFORM_ORDER.map((platform) => (
                    <PlatformCard
                        key={platform}
                        platform={platform}
                        status={platformStatus[platform]}
                        done={platformProgress[platform].done}
                        total={platformProgress[platform].total}
                        errors={platformProgress[platform].errors}
                    />
                ))}
            </div>

            <Card className="w-full bg-slate-900 border-slate-700 p-5 rounded-xl h-48 overflow-y-auto font-mono text-sm" role="log" aria-live="polite" aria-label="Log de geração de posts">
                {logLines.length === 0 ? (
                    <p className="text-slate-500 italic">Aguardando conexão com agentes...</p>
                ) : (
                    logLines.map(({ key, text }) => (
                        <div key={key} className="flex gap-3 mb-2">
                            <span className="text-primary-400 shrink-0">
                                [{new Date().toLocaleTimeString('pt-BR')}]
                            </span>
                            <span className="text-slate-100">{text}</span>
                        </div>
                    ))
                )}
            </Card>

            {error && (
                <Card className="w-full mt-4 p-4 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 flex items-center gap-3">
                    <XCircle size={18} className="text-rose-600 shrink-0" />
                    <p className="text-rose-700 dark:text-rose-400 text-sm">{error}</p>
                </Card>
            )}

            {isComplete && (
                <Button
                    variant="primary"
                    onClick={() => navigate(`/campanhas/${campaignId}`)}
                    className="mt-8 flex items-center gap-2 px-10"
                >
                    Ver Posts <ArrowRight size={18} />
                </Button>
            )}
        </div>
    );
}
