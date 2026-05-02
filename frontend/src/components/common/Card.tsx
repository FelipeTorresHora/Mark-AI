import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
    return (
        <div
            className={`app-panel rounded-[30px] p-6 transition-all duration-300 ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
};
