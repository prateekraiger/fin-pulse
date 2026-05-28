import classnames from "classnames";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(classnames(...inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(date) {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns the current financial year string based on the current date.
 * Indian FY runs April to March, e.g. "2025-2026" for Apr 2025 – Mar 2026.
 */
export function getCurrentFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

/**
 * Dynamically generates FY options based on the current date.
 * Always includes the current FY and 2 previous FYs.
 * Example (as of May 2026): FY 2025-26, FY 2024-25, FY 2023-24
 *   (current FY is 2025-2026 because we're between Apr 2025 – Mar 2026... wait
 *    May 2026 >= April => current FY is 2026-2027)
 */
export function getFYOptions() {
  const currentFY = getCurrentFY();
  const startYear = parseInt(currentFY.split("-")[0]);

  return [
    { value: `${startYear}-${startYear + 1}`, label: `FY ${startYear}-${String(startYear + 1).slice(-2)}` },
    { value: `${startYear - 1}-${startYear}`, label: `FY ${startYear - 1}-${String(startYear).slice(-2)}` },
    { value: `${startYear - 2}-${startYear - 1}`, label: `FY ${startYear - 2}-${String(startYear - 1).slice(-2)}` },
  ];
}
