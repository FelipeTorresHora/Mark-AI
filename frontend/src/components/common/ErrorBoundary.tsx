import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary genérico — captura erros de renderização e exibe
 * tela de recuperação ao invés de derrubar a aplicação inteira.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="text-center max-w-md">
                        <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                            Algo deu errado
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                            {this.state.error?.message ?? 'Erro inesperado na aplicação.'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <RefreshCw size={16} /> Tentar novamente
                            </button>
                            <button
                                onClick={this.handleHome}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Home size={16} /> Ir para home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
