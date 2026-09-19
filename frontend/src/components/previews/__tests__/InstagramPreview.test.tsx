import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstagramPreview } from '../InstagramPreview';

describe('InstagramPreview', () => {
    it('truncates long content until expanded', () => {
        const long = 'word '.repeat(80);
        render(<InstagramPreview content={long.trim()} author="brand" />);
        expect(screen.getByText(/mais/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText(/mais/i));
        expect(screen.queryByText(/mais/i)).not.toBeInTheDocument();
    });

    it('editable mode uses textarea', () => {
        const onChange = vi.fn();
        render(<InstagramPreview content="caption" editable onContentChange={onChange} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
        expect(onChange).toHaveBeenCalledWith('new');
    });
});
