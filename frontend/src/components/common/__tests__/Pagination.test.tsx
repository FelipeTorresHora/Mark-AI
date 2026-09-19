import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
    it('renders nothing when only one page', () => {
        const { container } = render(
            <Pagination page={0} total={5} limit={10} onPageChange={() => {}} />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('navigates pages', () => {
        const onPageChange = vi.fn();
        render(<Pagination page={1} total={50} limit={10} onPageChange={onPageChange} />);

        fireEvent.click(screen.getByLabelText('Próxima página'));
        expect(onPageChange).toHaveBeenCalledWith(2);

        fireEvent.click(screen.getByLabelText('Página anterior'));
        expect(onPageChange).toHaveBeenCalledWith(0);
    });
});
