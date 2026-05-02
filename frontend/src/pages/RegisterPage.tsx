
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { showError } from '../lib/toast';
import { getErrorMessage } from '../lib/utils';

const schema = z
    .object({
        email: z.email('E-mail inválido'),
        password: z.string().min(8, 'Mínimo 8 caracteres'),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
    });

type FormData = z.infer<typeof schema>;

const inputClass = "app-input text-sm px-3 py-2 rounded-[10px]";

export function RegisterPage() {
    const { register: registerUser } = useAuth();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        try {
            await registerUser(data.email, data.password);
        } catch (err: unknown) {
            showError(getErrorMessage(err, 'Erro ao criar conta'));
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
                    <h2 className="text-lg font-black app-text mb-6" style={{ lineHeight: 1.1 }}>Criar conta</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="register-email" className="block text-sm font-semibold app-text-secondary mb-1">
                                E-mail
                            </label>
                            <input
                                id="register-email"
                                {...register('email')}
                                type="email"
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'register-email-error' : undefined}
                                className={inputClass}
                                placeholder="voce@empresa.com"
                            />
                            {errors.email && (
                                <p id="register-email-error" className="text-red-500 text-xs mt-1" role="alert">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="register-password" className="block text-sm font-semibold app-text-secondary mb-1">
                                Senha
                            </label>
                            <input
                                id="register-password"
                                {...register('password')}
                                type="password"
                                autoComplete="new-password"
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? 'register-password-error' : undefined}
                                className={inputClass}
                                placeholder="Mínimo 8 caracteres"
                            />
                            {errors.password && (
                                <p id="register-password-error" className="text-red-500 text-xs mt-1" role="alert">{errors.password.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="register-confirm-password" className="block text-sm font-semibold app-text-secondary mb-1">
                                Confirmar senha
                            </label>
                            <input
                                id="register-confirm-password"
                                {...register('confirmPassword')}
                                type="password"
                                autoComplete="new-password"
                                aria-invalid={!!errors.confirmPassword}
                                aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
                                className={inputClass}
                                placeholder="••••••••"
                            />
                            {errors.confirmPassword && (
                                <p id="register-confirm-password-error" className="text-red-500 text-xs mt-1" role="alert">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 px-4 bg-primary-400 hover:scale-105 active:scale-95 text-primary-900 font-semibold rounded-full text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Criar conta
                        </button>
                    </form>

                    <p className="text-center text-sm app-text-soft mt-6">
                        Já tem conta?{' '}
                        <Link to="/login" className="text-primary-700 dark:text-primary-400 hover:underline font-semibold">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
