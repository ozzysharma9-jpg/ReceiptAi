import { Receipt } from "@/context/ReceiptsContext";

export const MONTHLY_BUDGET = 25000;

export function formatCurrency(amount: number, maximumFractionDigits = 0) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  })}`;
}

export function isSameMonth(dateValue: string, reference = new Date()) {
  const date = new Date(dateValue);
  return (
    date.getMonth() === reference.getMonth() &&
    date.getFullYear() === reference.getFullYear()
  );
}

export function monthReceipts(receipts: Receipt[], reference = new Date()) {
  return receipts.filter((receipt) => isSameMonth(receipt.date, reference));
}

export function shiftMonth(reference: Date, offset: number) {
  return new Date(reference.getFullYear(), reference.getMonth() + offset, 1);
}

export function categoryTotals(receipts: Receipt[]) {
  return receipts.reduce<Record<string, number>>((totals, receipt) => {
    totals[receipt.category] = (totals[receipt.category] ?? 0) + receipt.amount;
    return totals;
  }, {});
}

export function totalFor(receipts: Receipt[]) {
  return receipts.reduce((total, receipt) => total + receipt.amount, 0);
}

export function getDailyTotals(receipts: Receipt[], reference = new Date()) {
  const totals = new Map<number, number>();
  for (const receipt of monthReceipts(receipts, reference)) {
    const day = new Date(receipt.date).getDate();
    totals.set(day, (totals.get(day) ?? 0) + receipt.amount);
  }

  return Array.from(totals.entries())
    .sort(([dayA], [dayB]) => dayA - dayB)
    .map(([day, amount]) => ({ day, amount }));
}

export function getForecast(receipts: Receipt[], reference = new Date()) {
  const current = monthReceipts(receipts, reference);
  const spent = totalFor(current);
  const elapsedDays = Math.max(reference.getDate(), 1);
  const daysInMonth = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();
  const dailyRate = spent / elapsedDays;
  const expectedMonthEnd = dailyRate * daysInMonth;

  return {
    spent,
    dailyRate,
    expectedMonthEnd,
    daysInMonth,
    remainingBudget: MONTHLY_BUDGET - spent,
    overBudgetBy: Math.max(expectedMonthEnd - MONTHLY_BUDGET, 0),
    progress: Math.min(spent / MONTHLY_BUDGET, 1),
  };
}

export function getWeekendEffect(receipts: Receipt[]) {
  const weekend = receipts.filter((receipt) => {
    const day = new Date(receipt.date).getDay();
    return day === 0 || day === 6;
  });
  const weekday = receipts.filter((receipt) => {
    const day = new Date(receipt.date).getDay();
    return day !== 0 && day !== 6;
  });
  const weekendAverage = weekend.length ? totalFor(weekend) / weekend.length : 0;
  const weekdayAverage = weekday.length ? totalFor(weekday) / weekday.length : 0;

  return {
    percentage:
      weekdayAverage > 0
        ? Math.round(((weekendAverage - weekdayAverage) / weekdayAverage) * 100)
        : 0,
    weekendAverage,
    weekdayAverage,
  };
}

export function getRecurringTransactions(receipts: Receipt[]) {
  const groups = new Map<string, Receipt[]>();
  for (const receipt of receipts) {
    const key = receipt.merchant.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), receipt]);
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([key, items]) => ({
      merchant: items[0].merchant,
      amount: items
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)[0].amount,
      monthlyAmount:
        items.reduce((sum, item) => sum + item.amount, 0) / items.length,
      count: items.length,
      key,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

export function topCategory(receipts: Receipt[]) {
  const entries = Object.entries(categoryTotals(receipts)).sort(
    ([, amountA], [, amountB]) => amountB - amountA,
  );
  return entries[0] ?? null;
}