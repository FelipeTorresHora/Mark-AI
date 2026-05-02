import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    className = '',
    ...props
}) => {
    const baseStyle = "px-4 py-2 rounded-full font-semibold transition-all duration-150 ease-in-out hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        primary: "bg-primary-400 text-primary-900 shadow-[rgba(14,15,12,0.10)_0px_8px_24px_-16px] hover:bg-primary-300 hover:shadow-[rgba(159,232,112,0.45)_0px_16px_32px_-18px] dark:bg-primary-400 dark:text-primary-900 dark:hover:bg-primary-300",
        secondary: "app-panel-subtle border border-transparent app-text hover:border-[rgba(14,15,12,0.14)] hover:bg-[rgba(22,51,0,0.10)] dark:hover:border-white/10 dark:hover:bg-white/10",
        outline: "bg-transparent border border-[rgba(14,15,12,0.16)] text-primary-900 hover:bg-primary-50 hover:border-primary-300 dark:border-white/12 dark:text-primary-400 dark:hover:bg-primary-900/20 dark:hover:border-primary-500/40"
    };

    return (
        <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};
