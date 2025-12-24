import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

const luminanceCache = new Map<string, number>();
export const getLuminance = (hex: string) => {
  if (luminanceCache.has(hex)) return luminanceCache.get(hex)!;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  luminanceCache.set(hex, lum);
  return lum;
};

