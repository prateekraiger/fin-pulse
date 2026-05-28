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
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getCurrentFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

export function getFYOptions() {
  return [
    { value: "2024-2025", label: "FY 2024-25" },
    { value: "2023-2024", label: "FY 2023-24" },
    { value: "2022-2023", label: "FY 2022-23" },
  ];
}
