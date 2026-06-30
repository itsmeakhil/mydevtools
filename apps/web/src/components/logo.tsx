import React from 'react';
import Image from 'next/image';

interface LogoProps {
    size?: number;
    className?: string;
    showText?: boolean;
}

export function Logo({ size = 32, className = '', showText = true }: LogoProps) {
    return (
        <div className={`flex items-center space-x-3 ${className}`}>
            <div className="relative flex items-center justify-center">
                <Image
                    src="/logo-dark.png"
                    alt="Logo"
                    width={size}
                    height={size}
                    className="dark:hidden object-contain"
                />
                <Image
                    src="/logo-light.png"
                    alt="Logo"
                    width={size}
                    height={size}
                    className="hidden dark:block object-contain"
                />
            </div>
            {showText && (
                <div className="relative h-8 w-32 hidden sm:flex items-center">
                    <div className="relative h-8 w-24">
                        <Image
                            src="/logo-text-light.png"
                            alt="MyDevTools"
                            fill
                            className="dark:hidden object-contain"
                        />
                        <Image
                            src="/logo-text-dark.png"
                            alt="MyDevTools"
                            fill
                            className="hidden dark:block object-contain"
                        />
                    </div>
                    <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary shadow-sm ring-1 ring-primary/20">
                        Beta
                    </span>
                </div>
            )}
        </div>
    );
}
