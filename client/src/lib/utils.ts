import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number as millions with comma separators: 1,234,567 → "$1.2M" */
export function fmtM(value: number, decimals = 1): string {
  const v = Number(value) || 0;
  return `$${(v / 1_000_000).toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}M`;
}

/** Format number as thousands with comma separators: 123,456 → "$123K" */
export function fmtK(value: number, decimals = 0): string {
  const v = Number(value) || 0;
  return `$${(v / 1_000).toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}K`;
}

/** Format number as full currency with commas and 2 fixed decimals: 3928000 → "$3,928,000.00" */
export function fmtCurrency(value: number | string | null): string {
  const v = Number(value) || 0;
  return v.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
