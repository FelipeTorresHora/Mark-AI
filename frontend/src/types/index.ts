export type Platform = "X" | "LINKEDIN";
export type PostStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "FINAL" | "PUBLISHED";
export type PublishStatus = "pending" | "processing" | "published" | "failed" | "canceled";
export type AppPhase = "BRIEFING" | "STRATEGY" | "GENERATION" | "REVIEW";

export interface PostsPerPlatform {
    X: number;
    LINKEDIN: number;
}

export interface AuthUser {
    id: string;
    email: string;
}

export interface SocialAccount {
    id: string;
    platform: Platform;
    platform_user_id: string;
    expires_at: string | null;
    scope?: string | null;
    created_at: string;
}

export interface XAccountStatus {
    connected: boolean;
    reconnect_required: boolean;
    id?: string | null;
    x_user_id?: string | null;
    username?: string | null;
    expires_at?: string | null;
    last_publish_at?: string | null;
    last_error?: string | null;
}

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

/** Fonte única de verdade para Post — inclui todos os campos do backend. */
export interface Post {
    id: string;
    campaign_id?: string;
    user_id?: string;
    platform: Platform;
    content?: string;
    score?: number;
    feedback?: string;
    status: PostStatus;
    publish_status?: PublishStatus;
    scheduled_at?: string;
    published_at?: string;
    platform_post_id?: string;
    attempt_count?: number;
    last_attempt_at?: string | null;
    next_attempt_at?: string | null;
    error_code?: string | null;
    error_message?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CampaignSummary {
    id: string;
    topic: string;
    status: "PENDING" | "GENERATING" | "DONE" | "FAILED";
    post_count: number;
    created_at: string;
}

export interface CampaignDetail {
    id: string;
    topic: string;
    brand_context: Record<string, string>;
    status: string;
    created_at: string;
    updated_at: string;
}

/** Envelope de resposta paginada (backend). */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    skip: number;
    limit: number;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export interface ChatSession {
    id: string;
    messages: ChatMessage[];
    is_active: boolean;
    brand_profile_complete: boolean;
    created_at: string;
    updated_at: string;
}
