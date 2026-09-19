import { XPreview } from '../components/previews/XPreview';
import { LinkedInPreview } from '../components/previews/LinkedInPreview';
import { InstagramPreview } from '../components/previews/InstagramPreview';
import type { Platform } from '../types';

interface PostPreviewProps {
    platform: Platform;
    content: string;
    editable?: boolean;
    onContentChange?: (value: string) => void;
}

export function PostPreview({ platform, content, editable, onContentChange }: PostPreviewProps) {
    if (platform === 'X') {
        return (
            <XPreview
                content={content}
                editable={editable}
                onContentChange={onContentChange}
            />
        );
    }
    if (platform === 'INSTAGRAM') {
        return (
            <InstagramPreview
                content={content}
                editable={editable}
                onContentChange={onContentChange}
            />
        );
    }
    return (
        <LinkedInPreview
            content={content}
            editable={editable}
            onContentChange={onContentChange}
        />
    );
}
