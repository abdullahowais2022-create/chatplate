"use client";
import { X } from "lucide-react";
import { NativeSelect } from "@/components/ui/input";
import { ALL_LANGUAGES, POPULAR_LANGUAGES, languageName } from "@/lib/languages";

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & { placeholder?: string };

/** Dropdown of every language, with the most common ones first. */
export function LanguageSelect({ placeholder, ...props }: SelectProps) {
  return (
    <NativeSelect {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      <optgroup label="Most used">
        {POPULAR_LANGUAGES.map((l) => <option key={`p-${l.code}`} value={l.code}>{l.name}</option>)}
      </optgroup>
      <optgroup label="All languages">
        {ALL_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
      </optgroup>
    </NativeSelect>
  );
}

/** Pick several languages: chips for the chosen ones plus a dropdown to add more. */
export function LanguageMultiSelect({ value, onChange, locked = [], disabled }: { value: string[]; onChange: (v: string[]) => void; locked?: string[]; disabled?: boolean }) {
  const chosen = [...new Set([...locked, ...value])];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {chosen.map((code) => (
          <span key={code} className="inline-flex items-center gap-1 rounded-full border border-primary bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {languageName(code)}
            {!locked.includes(code) && !disabled && (
              <button type="button" onClick={() => onChange(value.filter((c) => c !== code))} aria-label={`Remove ${languageName(code)}`} className="rounded-full hover:text-foreground"><X className="h-3 w-3" /></button>
            )}
          </span>
        ))}
      </div>
      <LanguageSelect value="" placeholder="+ Add a language" disabled={disabled} aria-label="Add a language" onChange={(e) => e.target.value && onChange([...new Set([...value, e.target.value])])} className="max-w-xs" />
    </div>
  );
}
