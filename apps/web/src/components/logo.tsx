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
                <div className="relative h-8 w-32">
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
            )}
        </div>
    );
}
