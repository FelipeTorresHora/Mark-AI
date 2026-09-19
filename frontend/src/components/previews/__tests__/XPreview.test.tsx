import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { XPreview } from '../XPreview';

describe('XPreview', () => {
    it('shows over-limit styling beyond 280 chars', () => {
        const long = 'a'.repeat(281);
        render(<XPreview content={long} />);
        expect(screen.getByText(/281/)).toBeInTheDocument();
    });

    it('calls onContentChange when editable', () => {
        const onChange = vi.fn();
        render(<XPreview content="hi" editable onContentChange={onChange} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
        expect(onChange).toHaveBeenCalledWith('hello');
    });
});
