
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { showError } from '../lib/toast';

const schema = z.object({
    email: z.email('E-mail inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

const inputClass = "app-input text-sm px-3 py-2 rounded-[10px]";

export function LoginPage() {
    const { login } = useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        try {
            await login(data.email, data.password);
        } catch {
            showError('E-mail ou senha incorretos');
        }
    };

    return (
        <div className="min-h-screen app-shell flex items-center justify-center p-4 transition-colors duration-300">
            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <h1
                        className="font-black app-text tracking-tight"
                        style={{ fontSize: '4rem', lineHeight: 0.85 }}
                    >
                        MarkAI
                    </h1>
                    <p className="app-text-soft text-sm mt-3 font-semibold">Marketing com IA</p>
                </div>

                <div className="app-panel rounded-[30px] p-8">
                    <h2 className="text-lg font-black app-text mb-6" style={{ lineHeight: 1.1 }}>Entrar na sua conta</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="login-email" className="block text-sm font-semibold app-text-secondary mb-1">
                                E-mail
                            </label>
                            <input
                                id="login-email"
                                {...register('email')}
                                type="email"
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'login-email-error' : undefined}
                                className={inputClass}
                                placeholder="voce@empresa.com"
                            />
                            {errors.email && (
                                <p id="login-email-error" className="text-red-500 text-xs mt-1" role="alert">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="login-password" className="block text-sm font-semibold app-text-secondary mb-1">
                                Senha
                            </label>
                            <input
                                id="login-password"
                                {...register('password')}
                                type="password"
                                autoComplete="current-password"
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? 'login-password-error' : undefined}
                                className={inputClass}
                                placeholder="••••••••"
                            />
                            {errors.password && (
                                <p id="login-password-error" className="text-red-500 text-xs mt-1" role="alert">{errors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 px-4 bg-primary-400 hover:scale-105 active:scale-95 text-primary-900 font-semibold rounded-full text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Entrar
                        </button>
                    </form>

                    <p className="text-center text-sm app-text-soft mt-6">
                        Não tem conta?{' '}
                        <Link to="/register" className="text-primary-700 dark:text-primary-400 hover:underline font-semibold">
                            Criar conta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
