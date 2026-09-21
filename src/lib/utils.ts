import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Função ajudante para combinar classes CSS de forma inteligente
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}