import { useCallback, useMemo } from "react";
import { useStorage } from "./useStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";

export function useExpenses({ today, undoable }) {
  const [expenses, setExpenses] = useStorage(STORAGE_KEYS.expenses, []);
  const [budgets, setBudgets] = useStorage(STORAGE_KEYS.budgets, {});

  /**
   * `split` is optional. When present it's the block from buildSplit() —
   * { payerId, mode, shares:[{id, amount}] } — and the expense also shows up
   * in the khata.
   */
  const add = useCallback(({ amount, desc, cat, date, split = null }) => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return false;
    const what = String(desc || "").trim();
    if (!what) return false;   // a description is required; the category is not
    setExpenses((prev) => [
      {
        id: Date.now(),
        amount: value,
        desc: what,
        cat: cat || "Other",
        date: date || today,
        ...(split ? { split } : {}),
      },
      ...prev,
    ]);
    return true;
  }, [setExpenses, today]);

  const remove = useCallback((id) => {
    const index = expenses.findIndex((e) => e.id === id);
    if (index < 0) return;
    const expense = expenses[index];
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    undoable(`Deleted "${expense.desc}"`, () => {
      setExpenses((prev) => {
        const restored = [...prev];
        restored.splice(index, 0, expense);
        return restored;
      });
    });
  }, [expenses, setExpenses, undoable]);

  /**
   * Fix a logged expense. A split bill keeps its amount (the shares are worked
   * out from it), so for those only the words and the date can change.
   */
  const update = useCallback((id, { amount, desc, cat, date }) => {
    const before = expenses.find((e) => e.id === id);
    if (!before) return false;
    const what = String(desc ?? before.desc).trim();
    if (!what) return false;
    let value = before.amount;
    if (!before.split && amount !== undefined) {
      value = parseFloat(amount);
      if (!Number.isFinite(value) || value <= 0) return false;
    }
    const next = { ...before, amount: value, desc: what, cat: cat || before.cat || "Other", date: date || before.date };
    setExpenses((prev) => prev.map((e) => (e.id === id ? next : e)));
    undoable(`Updated "${what}"`, () => {
      setExpenses((prev) => prev.map((e) => (e.id === id ? before : e)));
    });
    return true;
  }, [expenses, setExpenses, undoable]);

  /** Drops the split from an expense but keeps the expense itself. */
  const unshare = useCallback((id) => {
    const expense = expenses.find((e) => e.id === id);
    if (!expense?.split) return;
    const previous = expense.split;
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, split: undefined } : e)));
    undoable(`"${expense.desc}" is no longer split`, () => {
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, split: previous } : e)));
    });
  }, [expenses, setExpenses, undoable]);

  /** A cap of 0 or empty removes the budget for that category. */
  const setBudget = useCallback((cat, value) => {
    const cap = parseFloat(value);
    setBudgets((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(cap) || cap <= 0) delete next[cat];
      else next[cat] = cap;
      return next;
    });
  }, [setBudgets]);

  return useMemo(() => ({
    all: expenses,
    budgets,
    add,
    remove,
    update,
    unshare,
    setBudget,
    replaceAll: setExpenses,
    replaceBudgets: setBudgets,
  }), [expenses, budgets, add, remove, update, unshare, setBudget, setExpenses, setBudgets]);
}