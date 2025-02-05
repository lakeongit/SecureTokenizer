import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function apiRequest(method: string, path: string, body?: any) {
  //Implementation of apiRequest function would go here.  This is not provided in the original code or changes.
}