# Especificação Técnica Frontend - MarkAI

## Stack
```
React 18 + TypeScript 5 | Vite 5
State: Zustand 4 (sliced) | TanStack Query v5
UI: Tailwind CSS 3 + shadcn/ui | Lucide Icons
Animations: Framer Motion | Validation: Zod
```

---

## 1. ARQUITETURA DE FLUXO (PHASED UI)

### Fases da Aplicação
```typescript
type AppPhase = "BRIEFING" | "STRATEGY" | "GENERATION" | "REVIEW";
```

**Controle de Transição**
- `BRIEFING → STRATEGY`: Requer `brand_context` completo
- `STRATEGY → GENERATION`: Requer `cmo_approval` + `topic`
- `GENERATION → REVIEW`: Requer 2+ posts com `status: APPROVED`

**Estrutura**
```
src/phases/
├── BriefingPhase.tsx      # Coleta inicial
├── StrategyPhase.tsx      # Conversa CMO
├── GenerationPhase.tsx    # Geração paralela
└── ReviewPhase.tsx        # Aprovação
```

**Hook de Controle**
```typescript
export function usePhaseControl() {
  const [phase, setPhase] = useState<AppPhase>("BRIEFING");
  const { brandContext, topic, posts } = useAppStore();
  
  const canProgress = useMemo(() => {
    if (phase === "BRIEFING") return !!brandContext?.name;
    if (phase === "STRATEGY") return !!topic && topic.length > 20;
    if (phase === "GENERATION") return posts.filter(p => p.status === "APPROVED").length >= 2;
    return false;
  }, [phase, brandContext, topic, posts]);
}
```

### Gestão SSE

**Tipos de Pacotes**
```typescript
type SSEPacketType = "CMO_MESSAGE" | "WRITER_STATUS" | "EVALUATION" | "ERROR";

interface SSEPacket {
  type: SSEPacketType;
  agentId: "cmo" | "writer_x" | "writer_linkedin";
  data: {
    content?: string;
    status?: "IDLE" | "THINKING" | "WRITING" | "EVALUATING" | "DONE" | "FAILED";
    score?: number;
    feedback?: string;
  };
}
```

**Hook SSE Otimizado**
```typescript
export function useSSE(endpoint: string) {
  const [packets, setPackets] = useState<SSEPacket[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  
  useEffect(() => {
    const es = new EventSource(endpoint);
    es.onmessage = (e) => {
      const packet: SSEPacket = JSON.parse(e.data);
      if (packet.type === "CMO_MESSAGE") setPackets(prev => [...prev, packet]);
      else if (packet.type === "WRITER_STATUS") {
        setAgentStatuses(prev => ({ ...prev, [packet.agentId]: packet.data.status! }));
      }
    };
    return () => es.close();
  }, [endpoint]);
}
```

### Feedback Visual

**Progress Stepper**
```typescript
const STEPS = [
  { id: "1", label: "Análise", agent: "cmo" },
  { id: "2", label: "Tweet", agent: "writer_x" },
  { id: "3", label: "LinkedIn", agent: "writer_linkedin" },
  { id: "4", label: "Avaliação", agent: "cmo" },
];
```

**Visual States**
- `THINKING`: Skeleton shimmer
- `WRITING`: Typing dots
- `EVALUATING`: Progress bar
- `DONE`: Check icon fade-in
- `FAILED`: Error shake

### Validação Schema

**Zod Schemas**
```typescript
export const BrandContextSchema = z.object({
  name: z.string().min(2),
  niche: z.string().min(5),
  tone: z.enum(["Autêntico", "Profissional", "Descolado", "Inspirador"]),
  targetAudience: z.string().min(10),
  uniqueValue: z.string().min(15),
});

export const GenerateRequestSchema = z.object({
  topic: z.string().min(20),
  conversationId: z.string().uuid().optional(),
  brandContext: BrandContextSchema,
});
```

---

## 2. DASHBOARD

### Smart Cards

**Estrutura**
```
components/dashboard/
├── KPICard.tsx
├── TotalPostsCard.tsx
├── ReviewQueueCard.tsx
└── EmptyState.tsx
```

**Interface**
```typescript
interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: LucideIcon;
  loading?: boolean;
  onClick?: () => void;
}
```

**Empty State**
```typescript
<div className="text-center p-8">
  <FileQuestion className="h-12 w-12 mx-auto text-muted" />
  <h3 className="text-lg font-semibold mt-4">Nenhum post criado</h3>
  <Button onClick={onNavigateToChat} className="mt-4">Iniciar</Button>
</div>
```

### Data Grid

**Estrutura**
```
components/dashboard/
├── PostsTable.tsx
├── PostRow.tsx
├── PlatformCell.tsx
├── StatusBadge.tsx
├── ScoreIndicator.tsx
└── ActionButtons.tsx
```

**Colunas**
```typescript
const COLUMNS = [
  { id: "platform", label: "Plataforma", width: "w-24" },
  { id: "preview", label: "Preview", width: "w-96" },
  { id: "score", label: "Score", width: "w-20" },
  { id: "status", label: "Status", width: "w-32" },
  { id: "actions", label: "Ações", width: "w-32" },
];
```

**Status Badges**
```typescript
const STATUS_CONFIG = {
  DRAFT: { label: "Rascunho", variant: "secondary", icon: FileEdit },
  UNDER_REVIEW: { label: "Em Revisão", variant: "warning", icon: Clock },
  APPROVED: { label: "Aprovado IA", variant: "success", icon: CheckCircle },
  REJECTED: { label: "Rejeitado", variant: "destructive", icon: XCircle },
  FINAL: { label: "Final", variant: "default", icon: Check },
};
```

**Action Handlers**
```typescript
function ActionButtons({ post, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);
  
  const handleApprove = async () => {
    setLoading(true);
    await onApprove(post.id);
    toast.success("Aprovado!");
  };
}
```

---

## 3. ESTADO (ZUSTAND)

### Slicing

**Store Structure**
```typescript
export const useAppStore = create(
  devtools(
    persist(
      (...a) => ({
        ...createChatSlice(...a),
        ...createPostSlice(...a),
        ...createDashboardSlice(...a),
      }),
      { name: "markai-storage" }
    )
  )
);
```

**Chat Slice**
```typescript
interface ChatSlice {
  messages: ConversationMessage[];
  isStreaming: boolean;
  addMessage: (msg: ConversationMessage) => void;
  clearChat: () => void;
}
```

**Post Slice**
```typescript
interface PostSlice {
  posts: Map<string, Post>;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  getPostsByStatus: (status: PostStatus) => Post[];
}
```

### React Query

**Config**
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 10,
      retry: 2,
    },
  },
});
```

**Hooks**
```typescript
export function usePosts(status?: PostStatus) {
  return useQuery({
    queryKey: ["posts", { status }],
    queryFn: () => api.get(`/posts${status ? `?status=${status}` : ""}`),
  });
}
```

### Optimistic UI

```typescript
const approveMutation = useMutation({
  mutationFn: (id: string) => api.patch(`/posts/${id}`, { status: "FINAL" }),
  
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["posts"] });
    const previous = queryClient.getQueryData(["posts"]);
    
    queryClient.setQueryData(["posts"], (old: Post[]) =>
      old.map(p => p.id === id ? { ...p, status: "FINAL" } : p)
    );
    
    return { previous };
  },
  
  onError: (err, id, context) => {
    queryClient.setQueryData(["posts"], context.previous);
    toast.error("Erro ao aprovar");
  },
  
  onSettled: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
});
```

---

## 4. UI/UX

### Preview X (Twitter)

```typescript
function XPreview({ content, author }) {
  const charCount = content.length;
  const isOver = charCount > 280;
  
  return (
    <div className="border rounded-2xl p-4 bg-white max-w-xl">
      <div className="flex gap-2 mb-3">
        <Avatar><AvatarFallback>{author?.[0]}</AvatarFallback></Avatar>
        <div>
          <p className="font-bold text-sm">{author}</p>
          <p className="text-xs text-muted">@markai · agora</p>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap mb-3">{content}</p>
      <span className={cn("text-xs", isOver && "text-red-500")}>
        {charCount}/280
      </span>
    </div>
  );
}
```

### Preview LinkedIn

```typescript
function LinkedInPreview({ content, author }) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > 300;
  
  return (
    <div className="border rounded-lg bg-white max-w-2xl">
      <div className="p-4 flex gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-blue-600 text-white">
            {author?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-xs text-muted">500+ conexões · 1m</p>
        </div>
      </div>
      <div className="px-4 pb-3">
        <p className="text-sm">{expanded ? content : content.slice(0, 300)}</p>
        {shouldTruncate && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-blue-600 text-sm mt-2">
            ...ver mais
          </button>
        )}
      </div>
    </div>
  );
}
```

### Toast System

```typescript
export const toast = {
  success: (msg: string) => sonnerToast.success(msg, { duration: 3000 }),
  error: (msg: string) => sonnerToast.error(msg, { duration: 5000 }),
  
  scoreAchieved: (score: number, platform: Platform) =>
    sonnerToast.success(`🎉 Score ${score}/100 no ${platform}!`, {
      position: "top-center",
      className: "bg-green-50",
    }),
  
  maxIterations: (platform: Platform) =>
    sonnerToast.warning(`⚠️ Max iterações no ${platform}. Revise.`, {
      position: "top-center",
    }),
};
```

### Responsividade

**Table Responsiva**
```typescript
<div className="overflow-x-auto">
  <table className="w-full min-w-[800px]">{/* Desktop */}</table>
</div>

<div className="lg:hidden space-y-4">
  {posts.map(p => <PostCard key={p.id} post={p} />)} {/* Mobile */}
</div>
```

### Score Indicator

```typescript
function ScoreIndicator({ score }) {
  const color = score >= 90 ? "text-green-600" : score >= 70 ? "text-yellow-600" : "text-red-600";
  
  return (
    <div className="relative h-12 w-12" aria-label={`Score ${score}`}>
      <svg className="-rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="2" />
        <circle cx="18" cy="18" r="16" fill="none" className={color} strokeWidth="2" 
          strokeDasharray={`${score}, 100`} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-bold", color)}>
        {score}
      </span>
    </div>
  );
}
```

---

## 5. ESTRUTURA DE ARQUIVOS

```
src/
├── phases/              # Phased UI components
├── components/
│   ├── dashboard/       # KPI cards, table, actions
│   ├── agents/          # Orchestrator, progress stepper
│   ├── previews/        # X, LinkedIn mocks
│   └── ui/              # shadcn components
├── hooks/
│   ├── usePhaseControl.ts
│   ├── useSSE.ts
│   ├── usePosts.ts
│   └── usePostActions.ts
├── store/
│   ├── index.ts
│   ├── chatSlice.ts
│   ├── postSlice.ts
│   └── dashboardSlice.ts
├── lib/
│   ├── api.ts           # Axios instance
│   ├── queryClient.ts   # TanStack config
│   ├── toast.ts         # Toast helpers
│   └── schemas.ts       # Zod schemas
└── types/
    └── index.ts         # TS interfaces
```

---

**Doc frontend dev sênior | Foco: arquitetura avançada, patterns React, UX profissional**