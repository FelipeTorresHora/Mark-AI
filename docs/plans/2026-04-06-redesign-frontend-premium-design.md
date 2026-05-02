# Plano de Implementação de Redesign Ultra-Premium (Revisão v4)

> **Para Claude / Antigravity:** SUB-HABILIDADE OBRIGATÓRIA: Use superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Objetivo:** Transformar o frontend em um design Ultra-Premium & Tecnológico, focado em Dark Mode predominante, cores vibrantes/neon, bordas com acabamento "glassmorphism" e microanimações baseadas na escolha A do brainstorming. Plano atualizado para manter total compatibilidade com **Tailwind CSS v4** e garantir coerência visual em todos os componentes.

**Arquitetura:** Tailwind v4 utiliza uma configuração "CSS-first", onde tokens e cores são definidos no arquivo principal (`index.css`) através da diretiva `@theme`. Injetaremos as paletas "Fuchsia/Neon" lá, e aplicaremos as classes de glow/glassmorphism usando variáveis CSS nativas. Manteremos os nomes de variáveis (`surface`, `primary`) intocados em sua estrutura principal (exceto substituindo a base de azul para fuchsia), ou faremos substituição explícita.

**Estado do Tema:** Confirmado que o app já gerencia a classe `.dark` no elemento `<html>` via `useAppStore` (`themeSlice.ts`), portanto, não é necessária lógica extra de toggle — apenas aplicar as utilitárias `dark:`.

**Stack Tecnológica:** React, Vite, Tailwind CSS v4, Lucide-React.

---

### Tarefa 1: Configuração do TailwindCSS v4 no `index.css`

**Arquivos:**
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/src/index.css`
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/tailwind.config.js`

**Passo 1: Escreva a configuração limpa do v4 no CSS Global**
*No Tailwind v4, o uso de `@import "tailwindcss";` no `index.css` substitui o antigo @tailwind layer.*

```css
@import "tailwindcss";

@theme {
  /* Substituir o azul "primary" por tons Fuchsia / Neon */
  --color-primary-50: #fdf4ff;
  --color-primary-100: #fae8ff;
  --color-primary-200: #f5d0fe;
  --color-primary-300: #f0abfc;
  --color-primary-400: #e879f9;
  --color-primary-500: #d946ef; /* Fuchsia vibrante/Neon */
  --color-primary-600: #c026d3;
  --color-primary-700: #a21caf;
  --color-primary-800: #86198f;
  --color-primary-900: #701a75;
  --color-primary-950: #4a044e;

  /* Sobrescrever tons de superfície para Ultra Dark */
  --color-background-dark: #000000;
  
  /* Mantemos --color-surface original como #ffffff se existir pra não quebrar, 
     mas componentes escuros usarão slate-950 diretamente. */

  /* Sombras Glow e Neon */
  --shadow-neon: 0 0 15px -3px rgba(217, 70, 239, 0.4);
  --shadow-neon-strong: 0 0 20px 2px rgba(217, 70, 239, 0.6);
  --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

@utility glass-panel {
  background-color: color-mix(in srgb, var(--color-slate-900) 40%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--color-slate-700) 50%, transparent);
  box-shadow: var(--shadow-glass);
}

@utility glow-border {
  border: 1px solid transparent;
  background-image: linear-gradient(var(--color-slate-900), var(--color-slate-900)), 
                    linear-gradient(120deg, var(--color-slate-700), var(--color-primary-500), var(--color-slate-700));
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

@utility text-glow {
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(to right, var(--color-primary-400), var(--color-primary-600));
}

@utility animate-pulse-slow {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Passo 2: Limpar o JS (Config Legado v3)**
Remover as definições de `colors` de dentro do `tailwind.config.js` porque já estão no `index.css`. Manteremos apenas `fontFamily` ou `extend` se ainda estritamente necessário em JS, embora seja recomendado mover tudo para o CSS.

---

### Tarefa 2: Atualização do Layout Principal

**Arquivos:**
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/src/components/layout/MainLayout.tsx`

**Passo 1: Aplicar Layout Ultra Dark System-wide**
```tsx
import React from 'react';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        {/* Forçamos black base em dark-mode */}
        <div className="flex h-screen bg-slate-50 dark:bg-black font-sans overflow-hidden transition-colors duration-300">
            {/* Decoração radial */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-900/30 blur-[120px] pointer-events-none animate-pulse-slow dark:block hidden" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[100px] pointer-events-none dark:block hidden" />
            
            <Sidebar />
            <main className="flex-1 flex flex-col items-center p-6 lg:p-10 relative overflow-y-auto w-full custom-scrollbar z-10">
                <section className="w-full max-w-5xl flex-1 flex flex-col relative z-20 pb-20">
                    {children}
                </section>
            </main>
        </div>
    );
}
```

---

### Tarefa 3: Refatorar Componentes Shell (Card, Button e Sidebar)

**Arquivos:**
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/src/components/common/Card.tsx`
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/src/components/common/Button.tsx`
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/src/components/layout/Sidebar.tsx`

**Passo 1: Card + Glassmorphism**
O Card deve usar a nova utilitária `.glass-panel` quando estiver no Dark Mode. Se estiver no light mode, manter visual atual.

**Passo 2: Button + Glow**
O Button variante `primary` deve adicionar a `shadow-neon` no `hover`.

**Passo 3: Consolidar "Sidebar.tsx"**
Remover os azulão legados (ex: `bg-primary-600`). No hover de abas e ícones ativos, adicionar um brilho neon/fuchsia pálido ou usar fundo glassmorphism.

---

### Tarefa 4: Escalar Design para Componentes Específicos

**Arquivos:**
- Modificar componentes adicionais que possuem hardcoded colors: 
`KPICard.tsx`, `PostsTable.tsx`, `ScoreIndicator.tsx`.

**Passo 1: Varredura de Core Components**
Refatorá-los para usar as novas diretivas fuchsia ou slate dark. Substituir lógicas antigas de bg azuis/verdes padrões por tons neon (esmeralda brilhante, fuchsia, etc).

---

### Tarefa 5: Dashboard e Ajustes Finais de Cores (Status Badges)

**Arquivos:**
- Modificar: `c:/Users/Felipe/Documents/codigos/marketing/frontend/src/pages/DashboardPage.tsx`

**Passo 1: Modernizar os Indicadores de Status**
Em `STATUS_CONFIG`, em vez de `bg-blue-100 text-blue-700`, usaremos bordas glow ou backgrounds dark sutis (ex: `dark:bg-primary-950/50 dark:border-primary-500/30 dark:text-primary-400 border border-transparent` para PENDENTE/GERANDO) injetando o novo fuchsia. Concluído deverá ir para tons de `emerald-400` mais vibrantes em um sub-frame transparente de 10% (glass).

**Passo 2: Título com Text Glow**
`<h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Campanhas</h1>`

---
