import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export default function Button({ children, isLoading, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={cn(
        "relative overflow-hidden font-bold rounded-xl transition-all active:scale-95 disabled:opacity-80 disabled:active:scale-100 flex justify-center items-center gap-2",
        className
      )}
    >
      <div className={cn("flex items-center gap-2", isLoading && "opacity-70")}>
        {children}
      </div>
      
      {isLoading && (
        <div className="absolute bottom-0 left-0 h-1.5 w-full bg-black/10 overflow-hidden">
          <div className="h-full bg-white/60 w-1/2 rounded-full animate-loading-bar" />
        </div>
      )}
    </button>
  );
}
