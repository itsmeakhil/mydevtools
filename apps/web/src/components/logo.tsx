import React from 'react';

interface LogoProps {
    size?: number;
    className?: string;
    showText?: boolean;
}

export function Logo({ size = 32, className = '', showText = true }: LogoProps) {
    return (
        <div className={`flex items-center space-x-3 ${className}`}>
            <div className="relative flex items-center justify-center">
                {/* Light Mode Logo (Dark Color) */}
                <img
                    src="/logo-dark.png"
                    alt="Logo"
                    width={size}
                    height={size}
                    className="dark:hidden object-contain"
                />
                {/* Dark Mode Logo (Light Color) */}
                <img
                    src="/logo-light.png"
                    alt="Logo"
                    width={size}
                    height={size}
                    className="hidden dark:block object-contain"
                />
            </div>
            {showText && (
                <div className="relative h-8 w-32">
                    {/* Light Mode Text (Dark Color) */}
                    <img
                        src="/logo-text-light.png"
                        alt="MyDevTools"
                        className="dark:hidden object-contain h-full w-full"
                    />
                    {/* Dark Mode Text (Light Color) */}
                    <img
                        src="/logo-text-dark.png"
                        alt="MyDevTools"
                        className="hidden dark:block object-contain h-full w-full"
                    />
                </div>
            )}
        </div>
    );
}
