"use client";

import { useEffect, useState } from "react";

const WORDS = ["chaotic.", "spreadsheets.", "stressful.", "simple."];

export function Typewriter() {
  const [wordIndex, setWordIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [deleting, setDeleting] = useState(0 as 0 | 1);

  useEffect(() => {
    const word = WORDS[wordIndex];
    const isLast = wordIndex === WORDS.length - 1;

    if (!deleting) {
      if (charCount < word.length) {
        const t = setTimeout(() => setCharCount((c) => c + 1), 60);
        return () => clearTimeout(t);
      }
      if (isLast) return;
      const t = setTimeout(() => setDeleting(1), 1000);
      return () => clearTimeout(t);
    }
    if (charCount > 0) {
      const t = setTimeout(() => setCharCount((c) => c - 1), 35);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setDeleting(0);
      setWordIndex((i) => i + 1);
    }, 300);
    return () => clearTimeout(t);
  }, [charCount, deleting, wordIndex]);

  const word = WORDS[wordIndex];
  const typed = word.slice(0, charCount);
  const done = wordIndex === WORDS.length - 1 && charCount === word.length;

  return (
    <>
      <span className="text-primary">
        {typed}
        <span className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-1 animate-pulse bg-primary align-middle" />
      </span>
      {done && (
        <div className="mt-2 animate-in fade-in text-base font-bold text-accent">
          ✓ HireSphere makes it simple.
        </div>
      )}
    </>
  );
}
