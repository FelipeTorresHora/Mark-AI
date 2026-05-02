import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
    it('renders button with correct text', () => {
        render(<Button>Gerar Posts</Button>);
        expect(screen.getByText('Gerar Posts')).toBeTruthy();
    });

    it('applies primary variant styles', () => {
        render(<Button variant="primary">Primary</Button>);
        const btn = screen.getByText('Primary');
        expect(btn.tagName).toBe('BUTTON');
    });

    it('applies outline variant styles', () => {
        render(<Button variant="outline">Outline</Button>);
        expect(screen.getByText('Outline')).toBeTruthy();
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByText('Disabled')).toBeDisabled();
    });

    it('calls onClick when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        fireEvent.click(screen.getByText('Click me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<Button disabled onClick={handleClick}>Disabled</Button>);
        fireEvent.click(screen.getByText('Disabled'));
        expect(handleClick).not.toHaveBeenCalled();
    });
});
