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
                        {/* sizes matches the w-24 box — without it Next requests the
                            3840px source for a 96px wordmark, twice per page. */}
                        <Image
                            src="/logo-text-light.png"
                            alt="MyDevTools"
                            fill
                            sizes="96px"
                            className="dark:hidden object-contain"
                        />
                        <Image
                            src="/logo-text-dark.png"
                            alt="MyDevTools"
                            fill
                            sizes="96px"
                            className="hidden dark:block object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
