# Plano de Implementação de Frontend Foundation

> **Para Claude:** SUB-HABILIDADE OBRIGATÓRIA: Use superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Objetivo:** Construir a fundação do frontend da Agência de Marketing IA, criando uma interface moderna, estilosa e responsiva com paleta de cores em vários tons de azul e branco.

**Arquitetura:** O frontend será uma Single Page Application (SPA) modularizada. Utilizaremos o Zustand para gerenciamento de estado global (conversas, posts, UI state), e componentes reutilizáveis focados em uma estética limpa, moderna (como efeitos glassmorphism e micro-interações), aderindo aos princípios SOLID na componentização.

**Stack Tecnológica:** React 18, TypeScript, Vite, Zustand (estado), Tailwind CSS (para estilização rápida e temas azuis/brancos), Lucide React (ícones modernos).

---

### Tarefa 1: Setup do Projeto e Configuração do Tailwind (Temas Azul e Branco)

**Arquivos:**
- Criar: `tailwind.config.js`
- Criar: `src/index.css`
- Modificar: `package.json`

**Passo 1: Escreva o teste com falha**
*(Para documentação de setup inicial da ferramenta, vamos testar a presença das classes do Tailwind na renderização base. Pularemos o teste automatizado complexo nesta etapa de infraestrutura para focar na configuração, mas garantiremos que o app builda corretamente)*

**Passo 2: Execute o teste para verificar se falha**
```bash
npm run build
```
*(Espera-se que falhe se dependências não estiverem instaladas ou configuradas)*

**Passo 3: Escreva a implementação mínima**
Adicionar configurações base do projeto, incluindo as cores azuis modernas.

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Azul principal
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: '#ffffff',
        background: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-slate-800 font-sans antialiased;
  }
}
```

**Passo 4: Execute o teste para verificar se passa**
```bash
npm run build
```
*(Esperado: PASSOU)*

**Passo 5: Commit**
```bash
git add package.json tailwind.config.js src/index.css
git commit -m "chore: setup tailwind css com tema azul e branco"
```

---

### Tarefa 2: Definição de Tipos e Store do Zustand

**Arquivos:**
- Criar: `src/types/index.ts`
- Criar: `src/store/useAppStore.ts`
- Testar: `src/store/__tests__/useAppStore.test.ts`

**Passo 1: Escreva o teste com falha**
`src/store/__tests__/useAppStore.test.ts`:
```typescript
import { act } from 'react-dom/test-utils';
import { useAppStore } from '../useAppStore';

describe('useAppStore', () => {
  it('should set current conversation id', () => {
    const { setCurrentConversationId } = useAppStore.getState();
    act(() => {
      setCurrentConversationId('123-abc');
    });
    expect(useAppStore.getState().currentConversationId).toBe('123-abc');
  });
});
```

**Passo 2: Execute o teste para verificar se falha**
```bash
npx vitest src/store/__tests__/useAppStore.test.ts --run
```
*(Esperado: FALHA com módulo não encontrado)*

**Passo 3: Escreva a implementação mínima**
`src/types/index.ts`:
```typescript
export type Platform = "X" | "LINKEDIN";
export type PostStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "FINAL";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  conversation_id?: string;
  platform: Platform;
  content: string;
  score?: number;
  feedback?: string;
  status: PostStatus;
  iterations: number;
  created_at: string;
  updated_at: string;
}
```

`src/store/useAppStore.ts`:
```typescript
import { create } from 'zustand';
import { Conversation, Post } from '../types';

interface AppState {
  conversations: Conversation[];
  posts: Post[];
  currentConversationId: string | null;
  isGenerating: boolean;
  error: string | null;
  setCurrentConversationId: (id: string | null) => void;
  setGenerating: (generating: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  conversations: [],
  posts: [],
  currentConversationId: null,
  isGenerating: false,
  error: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setGenerating: (isGenerating) => set({ isGenerating }),
}));
```

**Passo 4: Execute o teste para verificar se passa**
```bash
npx vitest src/store/__tests__/useAppStore.test.ts --run
```
*(Esperado: PASSOU)*

**Passo 5: Commit**
```bash
git add src/types/index.ts src/store/useAppStore.ts src/store/__tests__/useAppStore.test.ts
git commit -m "feat: implementa store base com zustand e tipagens"
```

---

### Tarefa 3: Componentes Genéricos da UI (Botões e Cards Estilosos)

**Arquivos:**
- Criar: `src/components/common/Button.tsx`
- Criar: `src/components/common/Card.tsx`

**Passo 1: Escreva o teste com falha**
`src/components/common/__tests__/Button.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

test('renders button with correct text', () => {
  render(<Button>Gerar Posts</Button>);
  expect(screen.getByText('Gerar Posts')).toBeInTheDocument();
});
```

**Passo 2: Execute o teste para verificar se falha**
```bash
npx vitest src/components/common/__tests__/Button.test.tsx --run
```

**Passo 3: Escreva a implementação mínima**
`src/components/common/Button.tsx`:
```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 ease-in-out shadow-sm transform hover:-translate-y-0.5";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-500/30",
    secondary: "bg-white text-primary-700 border border-primary-100 hover:bg-primary-50",
    outline: "bg-transparent text-primary-600 border-2 border-primary-500 hover:bg-primary-50"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
```

`src/components/common/Card.tsx`:
```tsx
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-primary-900/5 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
};
```

**Passo 4: Execute o teste para verificar se passa**
```bash
npx vitest src/components/common/__tests__/Button.test.tsx --run
```

**Passo 5: Commit**
```bash
git add src/components/common/
git commit -m "feat: cria componentes de UI base (Button, Card) com aesthetic azul moderno"
```

---

### Tarefa 4: Layout Principal (Sidebar e Header)

**Arquivos:**
- Criar: `src/components/layout/MainLayout.tsx`
- Criar: `src/components/layout/Sidebar.tsx`

**Passo 1: Escreva o teste com falha**
`src/components/layout/__tests__/MainLayout.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { MainLayout } from '../MainLayout';

test('renders layout and children', () => {
  render(<MainLayout><div>Conteúdo da Página</div></MainLayout>);
  expect(screen.getByText('Conteúdo da Página')).toBeInTheDocument();
  expect(screen.getByText('MarkAI')).toBeInTheDocument(); // Logo na sidebar
});
```

**Passo 2: Execute o teste para verificar se falha**
```bash
npx vitest src/components/layout/__tests__/MainLayout.test.tsx --run
```

**Passo 3: Escreva a implementação mínima**
`src/components/layout/Sidebar.tsx`:
```tsx
import React from 'react';
import { MessageSquare, LayoutDashboard, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-primary-100 h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-700 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
          MarkAI
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-primary-700 bg-primary-50 rounded-xl font-medium">
          <MessageSquare size={20} /> Chat e Geração
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-primary-600 hover:bg-primary-50/50 rounded-xl transition-colors">
          <LayoutDashboard size={20} /> Dashboard
        </a>
      </nav>
      <div className="p-4 border-t border-primary-50">
        <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-primary-600">
          <Settings size={20} /> Configurações
        </a>
      </div>
    </aside>
  );
};
```

`src/components/layout/MainLayout.tsx`:
```tsx
import React from 'react';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Background gradient decorativo moderno */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary-100/50 to-transparent -z-10" />
        <div className="p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
```

**Passo 4: Execute o teste para verificar se passa**
```bash
npx vitest src/components/layout/__tests__/MainLayout.test.tsx --run
```

**Passo 5: Commit**
```bash
git add src/components/layout/
git commit -m "feat: implementa layout principal com sidebar no estilo azul elegante"
```

---

### Tarefa 5: Página Principal de Chat e Geração

**Arquivos:**
- Criar: `src/pages/GeneratePage.tsx`
- Modificar: `src/App.tsx`

**Passo 1: Escreva o teste com falha**
`src/pages/__tests__/GeneratePage.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { GeneratePage } from '../GeneratePage';

test('renders chat input and generate button', () => {
  render(<GeneratePage />);
  expect(screen.getByPlaceholderText(/O que vamos criar hoje/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Enviar/i })).toBeInTheDocument();
});
```

**Passo 2: Execute o teste para verificar se falha**
```bash
npx vitest src/pages/__tests__/GeneratePage.test.tsx --run
```

**Passo 3: Escreva a implementação mínima**
`src/pages/GeneratePage.tsx`:
```tsx
import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Send, Bot } from 'lucide-react';

export const GeneratePage: React.FC = () => {
  const [prompt, setPrompt] = useState('');

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <header className="mb-8 text-center mt-6">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Criador de Campanhas IA</h2>
          <p className="text-slate-500 mt-2">Descreva sua ideia e deixe os agentes criarem seus posts.</p>
        </header>

        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
           {/* Placeholder para as mensagens do chat */}
           <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
               <Bot size={24} />
             </div>
             <Card className="flex-1 bg-white shadow-sm border-primary-100">
               <p className="text-slate-700">Olá! Eu sou o CMO IA. Descreva o produto ou promoção que deseja divulgar no X e LinkedIn.</p>
             </Card>
           </div>
        </div>

        <div className="sticky bottom-0 bg-background/80 backdrop-blur-md pt-4 pb-4">
          <Card className="!p-2 shadow-lg border-primary-200 focus-within:ring-2 ring-primary-400 transition-all">
            <div className="flex items-end gap-2">
              <textarea 
                className="w-full bg-transparent resize-none outline-none p-3 text-slate-700 placeholder-slate-400"
                rows={2}
                placeholder="Ex: O que vamos criar hoje? Fale sobre o novo lançamento..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <Button className="h-12 w-12 !p-0 flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-500">
                <Send size={20} className="text-white ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};
```

`src/App.tsx` (Substituir o conteúdo padrão):
```tsx
import React from 'react';
import { GeneratePage } from './pages/GeneratePage';

function App() {
  return <GeneratePage />;
}

export default App;
```

**Passo 4: Execute o teste para verificar se passa**
```bash
npx vitest src/pages/__tests__/GeneratePage.test.tsx --run
```

**Passo 5: Commit**
```bash
git add src/pages/ src/App.tsx
git commit -m "feat: cria página principal de geração com chat interface elegante"
```

---

### Tarefa 6: Componentes de Preview de Posts (X e LinkedIn)

**Arquivos:**
- Criar: `src/components/posts/PostPreview.tsx`

**Passo 1: Escreva o teste com falha**
`src/components/posts/__tests__/PostPreview.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { PostPreview } from '../PostPreview';
import { Post } from '../../../types';

const mockPost: Post = {
  id: '1', platform: 'X', content: 'Lançamento incrível! #tech', 
  status: 'APPROVED', iterations: 1, created_at: '', updated_at: ''
};

test('renders post preview for X', () => {
  render(<PostPreview post={mockPost} />);
  expect(screen.getByText('Lançamento incrível! #tech')).toBeInTheDocument();
  expect(screen.getByText('X (Twitter)')).toBeInTheDocument();
});
```

**Passo 2: Execute o teste para verificar se falha**
```bash
npx vitest src/components/posts/__tests__/PostPreview.test.tsx --run
```

**Passo 3: Escreva a implementação mínima**
`src/components/posts/PostPreview.tsx`:
```tsx
import React from 'react';
import { Post } from '../../types';
import { Twitter, Linkedin, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../common/Card';

export const PostPreview: React.FC<{ post: Post }> = ({ post }) => {
  const isX = post.platform === 'X';
  const Icon = isX ? Twitter : Linkedin;
  const brandColor = isX ? 'text-slate-800' : 'text-[#0a66c2]';

  return (
    <Card className="relative overflow-hidden group">
      {/* Detalhe de cor lateral moderno */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isX ? 'bg-slate-800' : 'bg-[#0a66c2]'}`} />
      
      <div className="flex justify-between items-center mb-4 pl-2">
        <div className="flex items-center gap-2">
          <Icon size={20} className={brandColor} />
          <span className="font-semibold text-slate-700">{isX ? 'X (Twitter)' : 'LinkedIn'}</span>
        </div>
        
        {post.status === 'APPROVED' ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
            <CheckCircle size={14} /> Score ≥90
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
            <Clock size={14} /> Em revisão
          </span>
        )}
      </div>
      
      <div className="pl-2">
        <p className="whitespace-pre-wrap text-slate-800 text-sm leading-relaxed font-sans pb-4">
          {post.content}
        </p>
      </div>
      
      <div className="pl-2 border-t border-slate-100 pt-3 flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">Iteração #{post.iterations}</span>
        {post.score && (
          <span className="text-sm font-bold text-primary-600 hidden group-hover:block animate-in fade-in">
            CMO Score: {post.score}/100
          </span>
        )}
      </div>
    </Card>
  );
};
```

**Passo 4: Execute o teste para verificar se passa**
```bash
npx vitest src/components/posts/__tests__/PostPreview.test.tsx --run
```

**Passo 5: Commit**
```bash
git add src/components/posts/
git commit -m "feat: implementa previews de post para X e LinkedIn com design polido"
```
