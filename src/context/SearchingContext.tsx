"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SearchingContextType {
  isSearching: boolean;
  startSearching: () => void;
  stopSearching: () => void;
}

const SearchingContext = createContext<SearchingContextType | undefined>(undefined);

export function SearchingProvider({ children }: { children: ReactNode }) {
  const [isSearching, setIsSearching] = useState(false);

  const startSearching = () => setIsSearching(true);
  const stopSearching = () => setIsSearching(false);

  return (
    <SearchingContext.Provider value={{ isSearching, startSearching, stopSearching }}>
      {children}
    </SearchingContext.Provider>
  );
}

export function useSearching() {
  const context = useContext(SearchingContext);
  if (!context) {
    throw new Error("useSearching debe usarse dentro de SearchingProvider");
  }
  return context;
}
