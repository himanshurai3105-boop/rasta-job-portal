import React, { useState } from "react";
import AutocompleteInput from "./AutocompleteInput.jsx";

/**
 * Multi-value tag input with autocomplete. User types, picks a suggestion (or
 * presses Enter), it becomes a removable chip. Backed by the same
 * AutocompleteInput used for location/keyword search.
 */
const TagAutocompleteInput = ({ values, onChange, fetchOptions, options, placeholder }) => {
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
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            addValue(draft);
          }
        }}
        className="w-full px-4 py-3 rounded-xl border border-ink/10 focus-ring"
      />
      <p className="text-xs text-muted mt-1">Pick a suggestion, or type a value and press Enter.</p>
    </div>
  );
};

export default TagAutocompleteInput;
