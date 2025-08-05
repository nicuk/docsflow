import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Domain and protocol utilities for monorepo
export const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'docsflow.app';
export const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
