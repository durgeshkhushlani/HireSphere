"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";

export function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < value.length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, value.length);
    if (!digits) return;
    e.preventDefault();
    const next = [...value];
    for (let i = 0; i < digits.length; i += 1) next[i] = digits[i];
    onChange(next);
    refs.current[Math.min(digits.length, value.length - 1)]?.focus();
  }

  return (
    <div className="mb-6 flex gap-2.5">
      {value.map((digit, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          inputMode="numeric"
          maxLength={1}
          className="aspect-square h-auto w-full text-center text-lg font-bold"
        />
      ))}
    </div>
  );
}
