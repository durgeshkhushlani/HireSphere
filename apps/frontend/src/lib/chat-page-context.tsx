"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ChatPageContext = {
  type: string;
  applicationId?: string;
  driveId?: string;
  studentName?: string;
  driveTitle?: string;
  companyName?: string;
};

type ChatPageContextValue = {
  pageContext: ChatPageContext | null;
  setPageContext: (context: ChatPageContext | null) => void;
};

const Context = createContext<ChatPageContextValue | undefined>(undefined);

export function ChatPageContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<ChatPageContext | null>(null);
  return <Context.Provider value={{ pageContext, setPageContext }}>{children}</Context.Provider>;
}

export function useChatPageContext() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useChatPageContext must be used within ChatPageContextProvider");
  return ctx;
}
