import React, { useState } from "react";
import AutocompleteInput from "./AutocompleteInput.jsx";

/**
 * Multi-value tag input with autocomplete. User type karta hai, suggestion chunta hai
 * (ya Enter dabata hai), aur wo hata sakne wala chip ban jaata hai.
 */
const TagAutocompleteInput = ({
  values,
  onChange,
  fetchOptions,
  options,
  placeholder,
  helperText = "Pick a suggestion, or type your own and press Enter.",
  maxResults,
  minChars,
}) => {
  const [draft, setDraft] = useState("");

  const addValue = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  };

  const removeValue = (val) => {
    onChange(values.filter((v) => v !== val));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slateblue/10 text-slateblue font-medium"
          >
            {v}
            <button
              type="button"
              onClick={() => removeValue(v)}
              aria-label={`Remove ${v}`}
              className="hover:text-red-500 focus-ring rounded"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <AutocompleteInput
        value={draft}
        onChange={setDraft}
        onSelect={addValue}
        fetchOptions={fetchOptions}
        options={options}
        placeholder={placeholder}
        maxResults={maxResults}
        minChars={minChars}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            addValue(draft);
          }
        }}
        className="w-full px-4 py-3 rounded-xl border border-ink/10 focus-ring"
      />
      {helperText && <p className="text-xs text-muted mt-1">{helperText}</p>}
    </div>
  );
};

export default TagAutocompleteInput;