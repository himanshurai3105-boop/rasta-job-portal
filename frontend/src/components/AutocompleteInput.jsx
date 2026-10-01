import React, { useEffect, useRef, useState } from "react";

/**
 * Generic autocomplete text input.
 * - Pass `options` (array of strings) for static, client-side filtering (e.g. locations).
 * - Pass `fetchOptions` (async fn(query) => string[]) for dynamic, server-backed suggestions (e.g. job titles).
 * Only one of the two should be used at a time.
 */
const AutocompleteInput = ({
  value,
  onChange,
  onSelect,
  options,
  fetchOptions,
  placeholder,
  onKeyDown,
  className = "",
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (options) {
      const matches = options
        .filter((o) => o.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 8);
      setSuggestions(matches);
      setOpen(matches.length > 0);
    } else if (fetchOptions) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const results = await fetchOptions(val);
        setSuggestions(results);
        setOpen(results.length > 0);
      }, 250);
    }
  };

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
    if (onSelect) onSelect(option);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-ink/10 rounded-xl shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber/10 transition-colors focus-ring"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
