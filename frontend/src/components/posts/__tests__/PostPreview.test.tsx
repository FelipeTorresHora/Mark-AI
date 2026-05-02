import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PostPreview } from '../PostPreview';
import { type Post } from '../../../types';

const mockPost: Post = {
    id: '1',
    platform: 'X',
    content: 'Lançamento incrível! #tech',
    status: 'APPROVED',
    created_at: '',
    updated_at: '',
};

describe('PostPreview', () => {
    it('renders post preview for X', () => {
        render(<PostPreview post={mockPost} />);
        expect(screen.getByText('Lançamento incrível! #tech')).toBeTruthy();
        expect(screen.getByText('X (Twitter)')).toBeTruthy();
    });
});
