import { type Post } from '../../types';
import { Card } from '../common/Card';
import { XPreview } from '../previews/XPreview';
import { LinkedInPreview } from '../previews/LinkedInPreview';
import { ScoreIndicator } from '../ui/ScoreIndicator';
import { Button } from '../common/Button';
import { Check, X } from 'lucide-react';

interface PostsTableProps {
    posts: Post[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    isApproving: boolean;
    isRejecting: boolean;
}

export function PostsTable({ posts, onApprove, onReject, isApproving, isRejecting }: PostsTableProps) {
    if (posts.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl">
                Nenhum post em revisão no momento.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {posts.map(post => {
                const isX = post.platform === 'X';
                return (
                    <Card key={post.id} className="p-0 overflow-hidden border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row group transition-all duration-300">
                        <div className="p-6 md:flex-1 md:border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-black/40 flex items-center justify-center">
                            {isX
                                ? <XPreview content={post.content ?? ''} />
                                : <LinkedInPreview content={post.content ?? ''} />
                            }
                        </div>

                        <div className="p-6 md:w-72 flex flex-col justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Métricas</p>
                                <div className="flex items-center gap-3">
                                    {post.score !== undefined ? (
                                        <ScoreIndicator score={post.score} size={42} />
                                    ) : (
                                        <div className="text-xs text-slate-400">Score indisponível</div>
                                    )}
                                </div>
                                {post.feedback && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 bg-primary-50 dark:bg-primary-950/30 rounded p-3 border border-primary-100 dark:border-primary-500/20 shadow-sm">
                                        {post.feedback}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <Button
                                    variant="primary"
                                    className="w-full flex justify-center py-2.5 h-auto text-sm"
                                    onClick={() => onApprove(post.id)}
                                    disabled={isApproving || isRejecting}
                                >
                                    <Check size={16} className="mr-2" /> Aprovar Post
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full flex justify-center py-2.5 h-auto text-sm text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    onClick={() => onReject(post.id)}
                                    disabled={isApproving || isRejecting}
                                >
                                    <X size={16} className="mr-2" /> Rejeitar
                                </Button>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
