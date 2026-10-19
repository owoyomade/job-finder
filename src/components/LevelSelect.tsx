"use client";

import { LEVELS, LEVEL_LABELS, type Level } from "@/lib/types";
import { inputClass } from "./ui";

export function LevelSelect({
  value,
  onChange,
  id,
  allowAny = true,
}: {
  value: Level | "";
  onChange: (v: Level | "") => void;
  id?: string;
  allowAny?: boolean;
}) {
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value as Level | "")}>
      {allowAny && <option value="">Any level</option>}
      {!allowAny && (
        <option value="" disabled>
          Choose a level…
        </option>
      )}
      {LEVELS.map((l) => (
        <option key={l} value={l}>
          {LEVEL_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
