import { useEffect, useState } from "react";
import { readTasks, type Task } from "./tasks";

// The parent remounts this hook on identity changes, so one account never sees another board.
export function useBoard(scope: string) {
  const key = `kipivo.workbench.v1:${scope}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    function load() {
      try {
        setTasks(readTasks(localStorage.getItem(key)));
        setReady(true);
        setWarning("");
      } catch {
        setReady(false);
        setWarning(
          "Cannot read this board from browser storage. Check your browser settings and reload.",
        );
      }
    }
    function sync(event: StorageEvent) {
      if (event.key === null || event.key === key) load();
    }
    load();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  function change(update: (current: Task[]) => Task[]) {
    try {
      const next = update(readTasks(localStorage.getItem(key)));
      localStorage.setItem(key, JSON.stringify(next));
      setTasks(next);
      setWarning("");
      return true;
    } catch {
      setWarning("Changes were not saved. Check available browser storage and try again.");
      return false;
    }
  }
  return { tasks, ready, warning, change };
}
