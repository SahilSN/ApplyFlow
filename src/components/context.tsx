"use client";
import { createContext, useContext } from "react";
import type { State } from "@/lib/model";
export type Editor = {
  type:
    | "application"
    | "contact"
    | "interview"
    | "answer"
    | "experiment"
    | "document";
  initial?: Record<string, unknown>;
};
export type WorkspaceContext = {
  state: State;
  mutate: (action: string, payload: unknown) => Promise<unknown>;
  reload: () => Promise<void>;
  edit: (editor: Editor) => void;
  toast: (message: string) => void;
};
export const Context = createContext<WorkspaceContext | null>(null);
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Workspace unavailable");
  return ctx;
}
