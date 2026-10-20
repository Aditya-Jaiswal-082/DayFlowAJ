import { useCallback, useMemo } from "react";
import { useStorage } from "./useStorage.js";
import { STORAGE_KEYS } from "../lib/constants.js";
import { makePerson, makeSettlement } from "../lib/splits.js";

/**
 * The fixed accounts you split with, plus the payments between you.
 *
 * People are never hard-deleted while they still appear in a split — removing
 * one would silently rewrite past bills. `remove` refuses in that case and the
 * caller explains why.
 */
export function usePeople({ today, undoable }) {
  const [people, setPeople] = useStorage(STORAGE_KEYS.people, []);
  const [settlements, setSettlements] = useStorage(STORAGE_KEYS.settlements, []);

  const add = useCallback((name) => {
    const person = makePerson(name);
    if (!person) return null;
    if (people.some((p) => p.name.toLowerCase() === person.name.toLowerCase())) return null;
    setPeople((prev) => [...prev, person]);
    return person;
  }, [people, setPeople]);

  const rename = useCallback((id, name) => {
    const clean = String(name || "").trim();
    if (!clean) return;
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name: clean } : p)));
  }, [setPeople]);

  /** @returns {"ok"|"in-use"|"missing"} */
  const remove = useCallback((id, { usedIn = 0 } = {}) => {
    if (usedIn > 0) return "in-use";
    const index = people.findIndex((p) => p.id === id);
    if (index < 0) return "missing";
    const person = people[index];
    setPeople((prev) => prev.filter((p) => p.id !== id));
    undoable(`Removed ${person.name}`, () => {
      setPeople((prev) => {
        const next = [...prev];
        next.splice(index, 0, person);
        return next;
      });
    });
    return "ok";
  }, [people, setPeople, undoable]);

  const settle = useCallback(({ personId, amount, direction, date, note }) => {
    const entry = makeSettlement({ personId, amount, direction, date: date || today, note });
    if (!entry) return false;
    setSettlements((prev) => [entry, ...prev]);
    return true;
  }, [setSettlements, today]);

  const unsettle = useCallback((id) => {
    const index = settlements.findIndex((s) => s.id === id);
    if (index < 0) return;
    const entry = settlements[index];
    setSettlements((prev) => prev.filter((s) => s.id !== id));
    undoable("Payment removed", () => {
      setSettlements((prev) => {
        const next = [...prev];
        next.splice(index, 0, entry);
        return next;
      });
    });
  }, [settlements, setSettlements, undoable]);

  return useMemo(() => ({
    all: people,
    settlements,
    add,
    rename,
    remove,
    settle,
    unsettle,
    replaceAll: setPeople,
    replaceSettlements: setSettlements,
  }), [people, settlements, add, rename, remove, settle, unsettle, setPeople, setSettlements]);
}
