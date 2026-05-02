import React from 'react';
import { type Post } from '../../types';
import { Twitter, Linkedin, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../common/Card';

export const PostPreview: React.FC<{ post: Post }> = ({ post }) => {
    const isX = post.platform === 'X';
    const Icon = isX ? Twitter : Linkedin;
    const brandColor = isX ? 'text-slate-800' : 'text-[#0a66c2]';

    return (
        <Card className="relative overflow-hidden group mb-4">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isX ? 'bg-slate-800' : 'bg-[#0a66c2]'}`} />

            <div className="flex justify-between items-center mb-4 pl-2">
                <div className="flex items-center gap-2">
                    <Icon size={20} className={brandColor} />
                    <span className="font-semibold text-slate-700">{isX ? 'X (Twitter)' : 'LinkedIn'}</span>
                </div>

                {post.status === 'APPROVED' || post.status === 'FINAL' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                        <CheckCircle size={14} /> Aprovado
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

            {post.score && (
                <div className="pl-2 border-t border-slate-100 pt-3">
                    <span className="text-sm font-bold text-primary-600">Score: {post.score}/100</span>
                </div>
            )}
        </Card>
    );
};
