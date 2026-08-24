"use client";

import { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export default function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleInput(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, length - index);
    if (!digits) return;

    const chars = value.padEnd(length, " ").split("");
    for (let i = 0; i < digits.length; i++) {
      chars[index + i] = digits[i];
    }
    const next = chars.join("").trimEnd();
    onChange(next);

    const nextIndex = Math.min(index + digits.length, length - 1);
    refs.current[nextIndex]?.focus();
  }

  function handleBackspace(index: number) {
    const chars = value.split("");
    if (chars[index]) {
      chars.splice(index, 1);
      onChange(chars.join(""));
    } else if (index > 0) {
      chars.splice(index - 1, 1);
      onChange(chars.join(""));
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="otp-row" dir="ltr">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className="otp-box"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length - index}
          aria-label={`رمز التحقق ${index + 1}`}
          value={value[index] ?? ""}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              handleBackspace(index);
            }
          }}
        />
      ))}
    </div>
  );
}
