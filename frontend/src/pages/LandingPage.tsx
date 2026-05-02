import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Clock,
    Brain,
    TrendingDown,
    AlertCircle,
    Check,
    X,
    ChevronDown,
    ArrowRight,
    CheckCircle2,
    Linkedin,
    Twitter,
    Sparkles,
    CalendarDays,
    BarChart3,
    ShieldCheck,
} from 'lucide-react';

// ─── Design tokens ──────────────────────────────────────────────────────────
const G = '#9fe870'; // Wise Green
const DG = '#163300'; // Dark Green (button text)
const NB = '#0e0f0c'; // Near Black
const MINT = '#e2f6d5';
const LIGHT = '#f5f7f4';
const GRAY = '#868685';
const WARM = '#454745';

// ─── NavBar ──────────────────────────────────────────────────────────────────
function NavBar() {
    return (
        <header
            className="sticky top-0 z-50 backdrop-blur-md"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderBottom: '1px solid rgba(14,15,12,0.08)' }}
        >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <span
                        className="text-2xl tracking-tight"
                        style={{ fontWeight: 900, color: NB, fontFeatureSettings: '"calt"', lineHeight: 1 }}
                    >
                        Mark<span style={{ color: G }}>AI</span>
                    </span>
                </Link>
                <nav className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="px-5 py-2 text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
                        style={{
                            fontWeight: 600,
                            color: NB,
                            border: `1px solid rgba(14,15,12,0.18)`,
                            borderRadius: 9999,
                            fontFeatureSettings: '"calt"',
                        }}
                    >
                        Entrar
                    </Link>
                    <Link
                        to="/register"
                        className="px-5 py-2 text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
                        style={{
                            fontWeight: 600,
                            color: DG,
                            backgroundColor: G,
                            borderRadius: 9999,
                            fontFeatureSettings: '"calt"',
                        }}
                    >
                        Começar grátis
                    </Link>
                </nav>
            </div>
        </header>
    );
}

// ─── Floating notification card ──────────────────────────────────────────────
function FloatingCard() {
    return (
        <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute right-0 md:right-8 top-12 md:top-6 z-10"
            style={{
                background: '#fff',
                borderRadius: 20,
                boxShadow: 'rgba(14,15,12,0.14) 0px 0px 0px 1px, rgba(14,15,12,0.08) 0px 8px 32px',
                padding: '14px 18px',
                minWidth: 260,
                maxWidth: 300,
            }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: MINT }}
                >
                    <CheckCircle2 size={18} style={{ color: '#054d28' }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: '#054d28' }}>
                        Post publicado no LinkedIn ✓
                    </p>
                    <p className="text-xs truncate" style={{ color: WARM }}>
                        Campanha: Lançamento Q2 2026
                    </p>
                    <p className="text-xs mt-1" style={{ color: GRAY }}>
                        agora mesmo · 847 impressões
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ─── HeroSection ─────────────────────────────────────────────────────────────
function HeroSection() {
    return (
        <section className="relative overflow-hidden" style={{ backgroundColor: '#fff', paddingTop: 80, paddingBottom: 96 }}>
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center gap-12">
                    {/* Left: copy */}
                    <div className="flex-1 max-w-2xl">
                        <motion.h1
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.06 }}
                            style={{
                                fontWeight: 900,
                                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                                lineHeight: 0.88,
                                color: NB,
                                fontFeatureSettings: '"calt"',
                                letterSpacing: '-0.02em',
                                marginBottom: 28,
                            }}
                        >
                            Chega de aparecer só quando{' '}
                            <span style={{ color: G }}>tem tempo.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.14 }}
                            style={{
                                fontSize: 19,
                                fontWeight: 400,
                                color: WARM,
                                lineHeight: 1.55,
                                marginBottom: 36,
                                fontFeatureSettings: '"calt"',
                                maxWidth: 520,
                            }}
                        >
                            Crie, aprove e publique posts de{' '}
                            <strong style={{ color: NB }}>X</strong> e{' '}
                            <strong style={{ color: NB }}>LinkedIn</strong> com IA — em minutos, não horas. Seu negócio merece estar presente todo dia.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.22 }}
                            className="flex flex-wrap items-center gap-4"
                        >
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 px-7 py-3.5 text-base transition-transform duration-150 hover:scale-105 active:scale-95"
                                style={{
                                    fontWeight: 600,
                                    color: DG,
                                    backgroundColor: G,
                                    borderRadius: 9999,
                                    fontFeatureSettings: '"calt"',
                                }}
                            >
                                Criar minha conta grátis
                                <ArrowRight size={16} />
                            </Link>
                            <a
                                href="#como-funciona"
                                className="inline-flex items-center gap-1 text-base transition-opacity duration-150 hover:opacity-70"
                                style={{ fontWeight: 600, color: NB, fontFeatureSettings: '"calt"' }}
                            >
                                Ver como funciona <ArrowRight size={15} />
                            </a>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.35 }}
                            className="flex items-center gap-5 mt-8 flex-wrap"
                        >
                            {['Sem cartão de crédito', 'Cancele quando quiser', '5 min para configurar'].map((t) => (
                                <span
                                    key={t}
                                    className="flex items-center gap-1.5 text-sm"
                                    style={{ color: GRAY, fontFeatureSettings: '"calt"' }}
                                >
                                    <Check size={13} style={{ color: '#054d28' }} />
                                    {t}
                                </span>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: visual */}
                    <div className="flex-1 relative flex justify-center md:justify-end min-h-[320px] w-full md:max-w-[420px]">
                        {/* Main mock card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.55, delay: 0.1 }}
                            className="relative w-full max-w-sm"
                            style={{
                                background: '#fff',
                                borderRadius: 28,
                                boxShadow: 'rgba(14,15,12,0.12) 0px 0px 0px 1px, rgba(14,15,12,0.06) 0px 24px 64px',
                                padding: 24,
                                marginTop: 40,
                            }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#ffc091' }} />
                                <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#ffd11a' }} />
                                <div style={{ width: 8, height: 8, borderRadius: 9999, background: G }} />
                            </div>
                            <p className="text-xs font-semibold mb-3" style={{ color: GRAY, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Campanha gerada pela IA
                            </p>
                            <div className="space-y-3">
                                {[
                                    { platform: 'LinkedIn', status: 'Aprovado', color: '#0077b5' },
                                    { platform: 'X (Twitter)', status: 'Aguardando', color: NB },
                                    { platform: 'LinkedIn', status: 'Rascunho', color: '#0077b5' },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between px-3 py-2.5"
                                        style={{ background: LIGHT, borderRadius: 12 }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="flex items-center justify-center"
                                                style={{ width: 28, height: 28, borderRadius: 9999, background: item.color + '18' }}
                                            >
                                                {item.platform.startsWith('LinkedIn') ? (
                                                    <Linkedin size={13} style={{ color: item.color }} />
                                                ) : (
                                                    <Twitter size={13} style={{ color: item.color }} />
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold" style={{ color: NB }}>{item.platform}</span>
                                        </div>
                                        <span
                                            className="text-xs px-2 py-0.5"
                                            style={{
                                                borderRadius: 9999,
                                                fontWeight: 600,
                                                backgroundColor:
                                                    item.status === 'Aprovado'
                                                        ? MINT
                                                        : item.status === 'Aguardando'
                                                          ? '#ffd11a22'
                                                          : LIGHT,
                                                color:
                                                    item.status === 'Aprovado'
                                                        ? '#054d28'
                                                        : item.status === 'Aguardando'
                                                          ? '#7a5c00'
                                                          : WARM,
                                            }}
                                        >
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="w-full mt-4 py-2.5 text-sm font-semibold transition-transform duration-150 hover:scale-105 active:scale-95"
                                style={{ backgroundColor: G, color: DG, borderRadius: 9999, fontFeatureSettings: '"calt"' }}
                            >
                                Publicar aprovados →
                            </button>
                        </motion.div>

                        {/* Floating notification */}
                        <FloatingCard />
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── ProblemSection ──────────────────────────────────────────────────────────
const PAINS = [
    {
        icon: Clock,
        title: 'Falta de tempo',
        desc: 'Você tem um negócio inteiro pra tocar. Criar post todo dia não é opção — e quando lembra, já é tarde demais.',
    },
    {
        icon: Brain,
        title: 'Bloqueio criativo',
        desc: 'Página em branco, cursor piscando, prazo correndo. Você sabe que precisa postar, mas não sabe o quê.',
    },
    {
        icon: TrendingDown,
        title: 'Invisibilidade digital',
        desc: 'Sem consistência, o algoritmo te ignora. E quando o algoritmo te ignora, o cliente em potencial também ignora.',
    },
    {
        icon: AlertCircle,
        title: 'Erros de execução',
        desc: 'Post errado no momento errado na plataforma errada. Cada erro manual custa credibilidade — e não tem volta.',
    },
];

function ProblemSection() {
    return (
        <section style={{ backgroundColor: LIGHT, padding: '80px 0' }}>
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <p
                        className="text-sm font-semibold mb-3"
                        style={{ color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', fontFeatureSettings: '"calt"' }}
                    >
                        O problema real
                    </p>
                    <h2
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                            lineHeight: 0.9,
                            color: NB,
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                            maxWidth: 600,
                        }}
                    >
                        Por que 90% das PMEs somem das redes sociais?
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {PAINS.map(({ icon: Icon, title, desc }, i) => (
                        <motion.div
                            key={title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: i * 0.08 }}
                            style={{
                                background: '#fff',
                                borderRadius: 24,
                                padding: '28px 28px',
                                boxShadow: 'rgba(14,15,12,0.10) 0px 0px 0px 1px',
                            }}
                        >
                            <div
                                className="flex items-center justify-center mb-5"
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    backgroundColor: MINT,
                                }}
                            >
                                <Icon size={20} style={{ color: '#054d28' }} />
                            </div>
                            <h3
                                className="mb-2"
                                style={{ fontWeight: 700, fontSize: 18, color: NB, fontFeatureSettings: '"calt"' }}
                            >
                                {title}
                            </h3>
                            <p style={{ fontSize: 15, color: WARM, lineHeight: 1.55, fontFeatureSettings: '"calt"' }}>
                                {desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── HowItWorksSection ───────────────────────────────────────────────────────
const STEPS = [
    {
        num: '01',
        icon: Sparkles,
        title: 'Configure seu perfil',
        desc: 'Fale com o CMO IA sobre sua marca, nicho, público e tom de voz. Uma conversa e ele já sabe tudo.',
    },
    {
        num: '02',
        icon: BarChart3,
        title: 'IA gera os posts',
        desc: 'O Gemini cria textos otimizados para X e LinkedIn ao mesmo tempo. Copy profissional sem esforço.',
    },
    {
        num: '03',
        icon: ShieldCheck,
        title: 'Você revisa e aprova',
        desc: 'Edite, ajuste datas, aprove ou rejeite cada post individualmente. O controle final é sempre seu.',
    },
    {
        num: '04',
        icon: CalendarDays,
        title: 'Publicação automática',
        desc: 'Um clique publica direto nas plataformas conectadas. Ou agende para o momento certo do dia.',
    },
];

function HowItWorksSection() {
    return (
        <section id="como-funciona" style={{ backgroundColor: '#fff', padding: '88px 0' }}>
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-14 text-center"
                >
                    <p
                        className="text-sm font-semibold mb-3"
                        style={{ color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', fontFeatureSettings: '"calt"' }}
                    >
                        Como funciona
                    </p>
                    <h2
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                            lineHeight: 0.9,
                            color: NB,
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        4 passos. Zero enrolação.
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
                        <motion.div
                            key={num}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: i * 0.1 }}
                            className="relative flex flex-col"
                        >
                            {/* Connector line (hidden on last) */}
                            {i < 3 && (
                                <div
                                    className="hidden lg:block absolute top-7 left-full z-10"
                                    style={{ width: 'calc(100% - 56px)', height: 1, backgroundColor: 'rgba(14,15,12,0.1)', transform: 'translateX(-50%)' }}
                                />
                            )}
                            <div
                                className="flex items-center justify-center mb-5 flex-shrink-0"
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 9999,
                                    backgroundColor: G,
                                    position: 'relative',
                                    zIndex: 1,
                                }}
                            >
                                <Icon size={22} style={{ color: DG }} />
                            </div>
                            <span
                                className="text-xs font-semibold mb-2"
                                style={{ color: G, letterSpacing: '0.06em', fontFeatureSettings: '"calt"' }}
                            >
                                PASSO {num}
                            </span>
                            <h3 className="mb-2" style={{ fontWeight: 700, fontSize: 18, color: NB, fontFeatureSettings: '"calt"' }}>
                                {title}
                            </h3>
                            <p style={{ fontSize: 15, color: WARM, lineHeight: 1.55, fontFeatureSettings: '"calt"' }}>
                                {desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── SocialProofSection ──────────────────────────────────────────────────────
const TESTIMONIALS = [
    {
        stars: 5,
        quote: 'Em 2 semanas passei de 0 posts por mês para 20. Minha agência finalmente existe no LinkedIn — e os leads começaram a aparecer do nada.',
        name: 'Carla Mendes',
        role: 'Diretora de Marketing',
        company: 'Agência Pixel',
        initials: 'CM',
    },
    {
        stars: 5,
        quote: 'O CMO IA entendeu o posicionamento do meu SaaS melhor que qualquer briefing que já preenchi. A primeira campanha gerada ficou melhor que as que eu mesmo escrevia.',
        name: 'Rafael Torres',
        role: 'Fundador & CEO',
        company: 'SaaS B2B',
        initials: 'RT',
    },
    {
        stars: 5,
        quote: 'Antes eu passava 4h por semana criando conteúdo e ainda assim ficava inconsistente. Agora são 20 minutos. O resto eu invisto em atender clientes de verdade.',
        name: 'Juliana Faria',
        role: 'Consultora de RH',
        company: 'Freelancer',
        initials: 'JF',
    },
];

function SocialProofSection() {
    return (
        <section style={{ backgroundColor: LIGHT, padding: '88px 0' }}>
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 text-center"
                >
                    <p
                        className="text-sm font-semibold mb-3"
                        style={{ color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', fontFeatureSettings: '"calt"' }}
                    >
                        Depoimentos
                    </p>
                    <h2
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                            lineHeight: 0.9,
                            color: NB,
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Quem já usa, não volta atrás.
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {TESTIMONIALS.map(({ stars, quote, name, role, company, initials }, i) => (
                        <motion.div
                            key={name}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.45, delay: i * 0.1 }}
                            style={{
                                background: '#fff',
                                borderRadius: 24,
                                padding: '28px 24px',
                                boxShadow: 'rgba(14,15,12,0.10) 0px 0px 0px 1px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16,
                            }}
                        >
                            <div className="flex gap-0.5">
                                {Array.from({ length: stars }).map((_, si) => (
                                    <span key={si} style={{ color: '#ffd11a', fontSize: 16 }}>★</span>
                                ))}
                            </div>
                            <p style={{ fontSize: 15, color: WARM, lineHeight: 1.6, fontFeatureSettings: '"calt"', flex: 1 }}>
                                "{quote}"
                            </p>
                            <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid rgba(14,15,12,0.08)' }}>
                                <div
                                    className="flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                    style={{ width: 40, height: 40, borderRadius: 9999, backgroundColor: G, color: DG }}
                                >
                                    {initials}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: NB, fontFeatureSettings: '"calt"' }}>{name}</p>
                                    <p style={{ fontSize: 13, color: GRAY, fontFeatureSettings: '"calt"' }}>
                                        {role} · {company}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── FeatureComparisonSection ─────────────────────────────────────────────────
const COMPARISON = [
    ['Horas criando conteúdo manualmente', 'Posts prontos em minutos com IA'],
    ['Inconsistência e longos hiatos', 'Calendário editorial sempre cheio'],
    ['Tom de voz diferente em cada post', 'Marca consistente em toda publicação'],
    ['Publicar manualmente em cada rede', 'Publicação automática no X e LinkedIn'],
    ['Sem métricas ou histórico', 'Dashboard com histórico de campanhas'],
    ['Bloqueio criativo frequente', 'CMO IA sempre pronto para te inspirar'],
];

function FeatureComparisonSection() {
    return (
        <section style={{ backgroundColor: '#fff', padding: '88px 0' }}>
            <div className="max-w-5xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 text-center"
                >
                    <p
                        className="text-sm font-semibold mb-3"
                        style={{ color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', fontFeatureSettings: '"calt"' }}
                    >
                        Comparativo
                    </p>
                    <h2
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                            lineHeight: 0.9,
                            color: NB,
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        O que muda quando você usa.
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                    {/* Without */}
                    <div style={{ background: LIGHT, borderRadius: 24, padding: '28px 24px', boxShadow: 'rgba(14,15,12,0.08) 0px 0px 0px 1px' }}>
                        <h3
                            className="mb-5 flex items-center gap-2"
                            style={{ fontWeight: 700, fontSize: 17, color: '#d03238', fontFeatureSettings: '"calt"' }}
                        >
                            <span
                                className="flex items-center justify-center"
                                style={{ width: 28, height: 28, borderRadius: 9999, backgroundColor: '#ffeaea' }}
                            >
                                <X size={14} style={{ color: '#d03238' }} />
                            </span>
                            Sem MarkAI
                        </h3>
                        <div className="space-y-3">
                            {COMPARISON.map(([without], i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 py-2.5 px-3"
                                    style={{ background: '#fff', borderRadius: 12 }}
                                >
                                    <X size={15} style={{ color: '#d03238', flexShrink: 0, marginTop: 2 }} />
                                    <span style={{ fontSize: 14, color: WARM, fontFeatureSettings: '"calt"', lineHeight: 1.45 }}>{without}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* With */}
                    <div style={{ background: MINT, borderRadius: 24, padding: '28px 24px', boxShadow: `rgba(14,15,12,0.10) 0px 0px 0px 1.5px` }}>
                        <h3
                            className="mb-5 flex items-center gap-2"
                            style={{ fontWeight: 700, fontSize: 17, color: '#054d28', fontFeatureSettings: '"calt"' }}
                        >
                            <span
                                className="flex items-center justify-center"
                                style={{ width: 28, height: 28, borderRadius: 9999, backgroundColor: G }}
                            >
                                <Check size={14} style={{ color: DG }} />
                            </span>
                            Com MarkAI
                        </h3>
                        <div className="space-y-3">
                            {COMPARISON.map(([, withTool], i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 py-2.5 px-3"
                                    style={{ background: 'rgba(255,255,255,0.65)', borderRadius: 12 }}
                                >
                                    <Check size={15} style={{ color: '#054d28', flexShrink: 0, marginTop: 2 }} />
                                    <span style={{ fontSize: 14, color: '#054d28', fontWeight: 600, fontFeatureSettings: '"calt"', lineHeight: 1.45 }}>{withTool}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ─── PricingSection ──────────────────────────────────────────────────────────
const FOUNDER_FEATURES = [
    'Campanhas ilimitadas',
    'Publicação no X e LinkedIn',
    'CMO IA — briefing e copywriting',
    'Calendário editorial visual',
    'Biblioteca de templates por nicho',
    'Suporte prioritário via chat',
    'Acesso antecipado a novidades',
    'Preço travado para sempre',
];

const MONTHLY_FEATURES = [
    'Campanhas ilimitadas',
    'Publicação no X e LinkedIn',
    'CMO IA — briefing e copywriting',
    'Calendário editorial visual',
    'Biblioteca de templates por nicho',
];

function PricingSection() {
    return (
        <section style={{ backgroundColor: LIGHT, padding: '88px 0' }}>
            <div className="max-w-5xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 text-center"
                >
                    <p
                        className="text-sm font-semibold mb-3"
                        style={{ color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', fontFeatureSettings: '"calt"' }}
                    >
                        Planos
                    </p>
                    <h2
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                            lineHeight: 0.9,
                            color: NB,
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                            marginBottom: 12,
                        }}
                    >
                        Simples. Sem pegadinhas.
                    </h2>
                    <p style={{ fontSize: 17, color: WARM, fontFeatureSettings: '"calt"' }}>
                        Cancele quando quiser. Sem fidelidade, sem multa.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* Founder Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                        style={{
                            background: '#fff',
                            borderRadius: 28,
                            padding: '32px 28px',
                            boxShadow: `${G} 0px 0px 0px 2px, rgba(14,15,12,0.06) 0px 16px 48px`,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Top badge */}
                        <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold mb-5"
                            style={{ backgroundColor: '#ffc091', color: '#7a3000', borderRadius: 9999, fontFeatureSettings: '"calt"' }}
                        >
                            🔥 Apenas 50 vagas
                        </div>

                        <h3 style={{ fontWeight: 800, fontSize: 22, color: NB, fontFeatureSettings: '"calt"', marginBottom: 4 }}>
                            Plano Founder
                        </h3>
                        <p style={{ fontSize: 13, color: GRAY, fontFeatureSettings: '"calt"', marginBottom: 20 }}>
                            Preço travado. Para sempre.
                        </p>

                        <div className="flex items-end gap-1 mb-1">
                            <span style={{ fontWeight: 900, fontSize: 48, color: NB, lineHeight: 1, fontFeatureSettings: '"calt"' }}>
                                R$ 97
                            </span>
                            <span style={{ fontSize: 15, color: GRAY, marginBottom: 6, fontFeatureSettings: '"calt"' }}>/mês</span>
                        </div>
                        <p style={{ fontSize: 13, color: GRAY, fontFeatureSettings: '"calt"', marginBottom: 24 }}>
                            ou R$ 970/ano — <strong style={{ color: '#054d28' }}>2 meses grátis</strong>
                        </p>

                        <ul className="space-y-2.5 mb-7">
                            {FOUNDER_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-2.5">
                                    <Check size={15} style={{ color: '#054d28', flexShrink: 0 }} />
                                    <span style={{ fontSize: 14, color: WARM, fontFeatureSettings: '"calt"' }}>{f}</span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            to="/register"
                            className="flex items-center justify-center gap-2 py-3 w-full text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
                            style={{ fontWeight: 700, color: DG, backgroundColor: G, borderRadius: 9999, fontFeatureSettings: '"calt"' }}
                        >
                            Garantir minha vaga <ArrowRight size={15} />
                        </Link>

                        <p
                            className="text-center mt-3 text-xs font-semibold"
                            style={{ color: '#d03238', fontFeatureSettings: '"calt"' }}
                        >
                            ⚡ 37 vagas restantes
                        </p>
                    </motion.div>

                    {/* Monthly Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.12 }}
                        style={{
                            background: '#fff',
                            borderRadius: 28,
                            padding: '32px 28px',
                            boxShadow: 'rgba(14,15,12,0.10) 0px 0px 0px 1px',
                        }}
                    >
                        <div className="mb-5" style={{ height: 28 }} />

                        <h3 style={{ fontWeight: 800, fontSize: 22, color: NB, fontFeatureSettings: '"calt"', marginBottom: 4 }}>
                            Plano Mensal
                        </h3>
                        <p style={{ fontSize: 13, color: GRAY, fontFeatureSettings: '"calt"', marginBottom: 20 }}>
                            Sem compromisso de longo prazo.
                        </p>

                        <div className="flex items-end gap-1 mb-1">
                            <span style={{ fontWeight: 900, fontSize: 48, color: NB, lineHeight: 1, fontFeatureSettings: '"calt"' }}>
                                R$ 147
                            </span>
                            <span style={{ fontSize: 15, color: GRAY, marginBottom: 6, fontFeatureSettings: '"calt"' }}>/mês</span>
                        </div>
                        <p style={{ fontSize: 13, color: GRAY, fontFeatureSettings: '"calt"', marginBottom: 24 }}>
                            Cancele a qualquer momento
                        </p>

                        <ul className="space-y-2.5 mb-7">
                            {MONTHLY_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-2.5">
                                    <Check size={15} style={{ color: '#054d28', flexShrink: 0 }} />
                                    <span style={{ fontSize: 14, color: WARM, fontFeatureSettings: '"calt"' }}>{f}</span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            to="/register"
                            className="flex items-center justify-center gap-2 py-3 w-full text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
                            style={{
                                fontWeight: 700,
                                color: NB,
                                backgroundColor: 'transparent',
                                border: `1.5px solid rgba(14,15,12,0.22)`,
                                borderRadius: 9999,
                                fontFeatureSettings: '"calt"',
                            }}
                        >
                            Começar agora <ArrowRight size={15} />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

// ─── FAQSection ───────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: 'Preciso saber escrever para usar?',
        a: 'Não. O CMO IA coleta o contexto da sua marca via conversa e gera os textos por você. Você só revisa e aprova.',
    },
    {
        q: 'Funciona para qualquer nicho?',
        a: 'Sim. Temos templates para lançamento de produto, depoimentos, conteúdo educativo e muito mais. O CMO IA adapta o tom para o seu público.',
    },
    {
        q: 'Minha conta do X e LinkedIn fica segura?',
        a: 'Completamente. Usamos OAuth 2.0 com PKCE (padrão da indústria), tokens criptografados no banco, e jamais armazenamos sua senha.',
    },
    {
        q: 'Posso editar os posts antes de publicar?',
        a: 'Sim, sempre. Na tela de revisão você edita o conteúdo, ajusta a data e hora de publicação, e só publica quando estiver satisfeito.',
    },
    {
        q: 'E se eu não gostar?',
        a: 'Cancele quando quiser, diretamente na plataforma. Sem multa, sem ligação de retenção, sem fidelidade obrigatória.',
    },
    {
        q: 'O que é o CMO IA?',
        a: 'É um assistente de chat que aprende sobre sua marca, público e objetivos. Use para criar briefings de campanha, ajustar o tom de voz e conectar suas contas sociais.',
    },
];

function FAQSection() {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <section style={{ backgroundColor: '#fff', padding: '88px 0' }}>
            <div className="max-w-2xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-10 text-center"
                >
                    <p
                        className="text-sm font-semibold mb-3"
                        style={{ color: GRAY, letterSpacing: '0.08em', textTransform: 'uppercase', fontFeatureSettings: '"calt"' }}
                    >
                        FAQ
                    </p>
                    <h2
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(2rem, 4vw, 3rem)',
                            lineHeight: 0.92,
                            color: NB,
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Perguntas frequentes.
                    </h2>
                </motion.div>

                <div className="space-y-3">
                    {FAQS.map(({ q, a }, i) => (
                        <motion.div
                            key={q}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.06 }}
                            style={{
                                borderRadius: 16,
                                overflow: 'hidden',
                                boxShadow: 'rgba(14,15,12,0.10) 0px 0px 0px 1px',
                                background: '#fff',
                            }}
                        >
                            <button
                                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-150"
                                style={{
                                    background: open === i ? MINT : 'transparent',
                                    cursor: 'pointer',
                                    border: 'none',
                                }}
                                onClick={() => setOpen(open === i ? null : i)}
                            >
                                <span style={{ fontWeight: 600, fontSize: 15, color: NB, fontFeatureSettings: '"calt"' }}>
                                    {q}
                                </span>
                                <ChevronDown
                                    size={18}
                                    style={{
                                        color: GRAY,
                                        flexShrink: 0,
                                        marginLeft: 12,
                                        transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.25s ease',
                                    }}
                                />
                            </button>
                            <AnimatePresence initial={false}>
                                {open === i && (
                                    <motion.div
                                        key="content"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <p
                                            style={{
                                                fontSize: 15,
                                                color: WARM,
                                                lineHeight: 1.6,
                                                padding: '0 20px 18px',
                                                fontFeatureSettings: '"calt"',
                                            }}
                                        >
                                            {a}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-14 text-center"
                    style={{ background: NB, borderRadius: 28, padding: '40px 32px' }}
                >
                    <h3
                        style={{
                            fontWeight: 900,
                            fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                            lineHeight: 0.95,
                            color: '#fff',
                            fontFeatureSettings: '"calt"',
                            letterSpacing: '-0.02em',
                            marginBottom: 14,
                        }}
                    >
                        Comece hoje. Poste amanhã.
                    </h3>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', fontFeatureSettings: '"calt"', marginBottom: 24 }}>
                        5 minutos para configurar. Conteúdo profissional desde o primeiro dia.
                    </p>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 px-7 py-3.5 text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
                        style={{ fontWeight: 700, color: DG, backgroundColor: G, borderRadius: 9999, fontFeatureSettings: '"calt"' }}
                    >
                        Criar minha conta grátis <ArrowRight size={15} />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
    return (
        <footer style={{ backgroundColor: NB, padding: '48px 0 32px' }}>
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
                    <div>
                        <span
                            className="text-2xl tracking-tight"
                            style={{ fontWeight: 900, color: '#fff', fontFeatureSettings: '"calt"', lineHeight: 1 }}
                        >
                            Mark<span style={{ color: G }}>AI</span>
                        </span>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontFeatureSettings: '"calt"', maxWidth: 260 }}>
                            Marketing com IA para quem tem um negócio de verdade.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-6">
                        {[
                            { label: 'Entrar', to: '/login' },
                            { label: 'Criar conta', to: '/register' },
                            { label: 'Termos de Uso', to: '#' },
                            { label: 'Privacidade', to: '#' },
                        ].map(({ label, to }) => (
                            <Link
                                key={label}
                                to={to}
                                className="text-sm transition-opacity duration-150 hover:opacity-70"
                                style={{ color: 'rgba(255,255,255,0.55)', fontFeatureSettings: '"calt"', fontWeight: 500 }}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
                <div
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}
                    className="flex flex-col md:flex-row items-center justify-between gap-3"
                >
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFeatureSettings: '"calt"' }}>
                        © 2026 MarkAI. Todos os direitos reservados.
                    </p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFeatureSettings: '"calt"' }}>
                        Feito com IA para quem faz de verdade.
                    </p>
                </div>
            </div>
        </footer>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
    return (
        <div className="min-h-screen" style={{ color: NB, fontFamily: 'Inter, sans-serif' }}>
            <NavBar />
            <HeroSection />
            <ProblemSection />
            <HowItWorksSection />
            <SocialProofSection />
            <FeatureComparisonSection />
            <PricingSection />
            <FAQSection />
            <Footer />
        </div>
    );
}
