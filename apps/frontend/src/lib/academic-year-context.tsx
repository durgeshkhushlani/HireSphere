"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { getCurrentAcademicYear } from "@/lib/academic-year";

type AcademicYearValue = {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
};

const Context = createContext<AcademicYearValue | undefined>(undefined);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
  return <Context.Provider value={{ selectedYear, setSelectedYear }}>{children}</Context.Provider>;
}

// Falls back to the current year outside a provider (e.g. the student
// dashboard, which never needs to browse past seasons) rather than throwing
// — unlike ChatPageContextProvider, this one is optional infrastructure.
export function useAcademicYear(): AcademicYearValue {
  const ctx = useContext(Context);
  if (ctx) return ctx;
  return { selectedYear: getCurrentAcademicYear(), setSelectedYear: () => {} };
}
