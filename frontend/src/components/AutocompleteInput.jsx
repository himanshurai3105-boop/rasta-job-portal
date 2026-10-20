import React, { useEffect, useRef, useState } from "react";
import { rankMatches } from "../utils/textMatch.js";

/**
 * Generic autocomplete text input.
 * - `options` (array of strings): static, client-side filtering.
 * - `fetchOptions` (async fn(query) => string[]): dynamic suggestions.
 * - `maxResults`: dropdown mein kitne options dikhane hain (default 8).
 * - `minChars`: kitne characters ke baad suggestions shuru hon (default 2).
 * User hamesha apna text khud bhi likh sakta hai.
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
  maxResults = 8,
  minChars = 2,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);

    if (val.trim().length < minChars) {
      requestIdRef.current += 1; // purani pending request ka result ignore hoga
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (options) {
      const matches = rankMatches(options, val, maxResults);
      setSuggestions(matches);
      setOpen(matches.length > 0);
    } else if (fetchOptions) {
      const reqId = ++requestIdRef.current;
      debounceRef.current = setTimeout(async () => {
        let results = [];
        try {
          results = (await fetchOptions(val)) || [];
        } catch {
          results = [];
        }
        if (reqId !== requestIdRef.current) return; // naya text type ho chuka hai
        setSuggestions(results.slice(0, maxResults));
        setOpen(results.length > 0);
      }, 350);
    }
  };

  const handleSelect = (option) => {
    requestIdRef.current += 1;
    clearTimeout(debounceRef.current);
    onChange(option);
    setOpen(false);
    setActiveIndex(-1);
    if (onSelect) onSelect(option);
  };

  const handleKeyDown = (e) => {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-ink/10 rounded-xl shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s}-${i}`}
              type="button"
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors focus-ring ${
                i === activeIndex ? "bg-amber/20" : "hover:bg-amber/10"
              }`}
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