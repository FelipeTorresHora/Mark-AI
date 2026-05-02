import React from 'react';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-shell flex h-screen font-sans overflow-hidden transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 flex flex-col items-center p-6 lg:p-10 relative overflow-y-auto w-full z-10" role="main">
                <section className="w-full max-w-5xl flex-1 flex flex-col relative z-20">
                    {children}
                </section>
            </main>
        </div>
    );
}
