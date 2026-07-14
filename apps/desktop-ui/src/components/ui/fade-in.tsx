"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  show: boolean;
}

export function FadeIn({ children, className, show }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  return (
    <div
      className={cn(
        "transition-opacity duration-300 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
