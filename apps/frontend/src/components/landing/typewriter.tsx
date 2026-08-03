"use client";

import { useEffect, useState } from "react";

const WORDS = ["chaotic.", "spreadsheets.", "stressful.", "simple."];
const TYPE_MS = 60;
const DELETE_MS = 35;
const HOLD_MS = 1000;
const PAUSE_MS = 300;

export function Typewriter() {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function tick() {
      const word = WORDS[wordIndex];
      const isLastWord = wordIndex === WORDS.length - 1;

      if (!deleting) {
        charIndex++;
        setDisplay(word.slice(0, charIndex));

        if (charIndex === word.length) {
          if (isLastWord) {
            setDone(true);
            return;
          }
          timeoutId = setTimeout(() => {
            deleting = true;
            tick();
          }, HOLD_MS);
          return;
        }
        timeoutId = setTimeout(tick, TYPE_MS);
        return;
      }

      charIndex--;
      setDisplay(word.slice(0, charIndex));
      if (charIndex === 0) {
        deleting = false;
        wordIndex++;
        timeoutId = setTimeout(tick, PAUSE_MS);
        return;
      }
      timeoutId = setTimeout(tick, DELETE_MS);
    }

    timeoutId = setTimeout(tick, TYPE_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <>
      <span className="text-primary">
        {display}
        <span className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-1 animate-pulse bg-primary align-middle" />
      </span>
      {done && (
        <span className="mt-2 block animate-in fade-in text-base font-bold text-accent">
          ✓ HireSphere makes it simple.
        </span>
      )}
    </>
  );
}
