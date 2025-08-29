"use client";

import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Input } from "~/components/ui/input";

import { cn } from "~/lib/utils";
import { Field } from "./field";

export type CategoryOption = {
  id: string;
  label: string;
};

type CategoryInputProps = {
  /** Currently selected category IDs */
  value: string[];
  /** Called when IDs change */
  onChange: (ids: string[]) => void;
  /** Options available for suggestion */
  options?: CategoryOption[];
  /** Placeholder */
  placeholder?: string;
  className?: string;
  canCreate?: boolean;
};

export function MultiSelectInput({
  value,
  onChange,
  options = [],
  placeholder = "Add categories...",
  className,
  canCreate,
}: CategoryInputProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keep internal mapping of id → label, including newly created items
  const [selectedLabels, setSelectedLabels] = React.useState<
    Map<string, string>
  >(() => {
    const map = new Map<string, string>();
    options.forEach((o) => map.set(o.id, o.label));
    return map;
  });

  React.useEffect(() => {
    // Add missing labels from new selections
    const map = new Map(selectedLabels);
    value.forEach((id) => {
      if (!map.has(id)) {
        const opt = options.find((o) => String(o.id) === id);
        map.set(id, opt?.label ?? id);
      }
    });
    setSelectedLabels(map);
  }, [value, options]);

  const filteredOptions = query
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query.toLowerCase()) &&
          !value.includes(opt.id)
      )
    : [];

  const addCategory = (opt: CategoryOption) => {
    if (!value.includes(opt.id)) {
      onChange([...value, opt.id]);
      setSelectedLabels(new Map(selectedLabels).set(opt.id, opt.label));
    }
    setQuery("");
    setOpen(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  const createCategory = (label: string) => {
    const newId = `new:${label}`;
    addCategory({ id: newId, label });
  };

  const removeCategory = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      if (open && filteredOptions.length > 0) {
        addCategory(filteredOptions[highlightedIndex]);
      } else {
        if (canCreate) createCategory(query.trim());
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        setOpen(true);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev === 0 ? filteredOptions.length - 1 : prev - 1
        );
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      removeCategory(value[value.length - 1]);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="flex items-center gap-1 rounded-full px-2 py-1"
            >
              {selectedLabels.get(id) ?? id}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeCategory(id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <Input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="text-foreground"
      />

      {/* Dropdown */}
      {open && (filteredOptions.length > 0 || query) && (
        <ul className="absolute top-10 z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md text-foreground">
          {filteredOptions.length > 0
            ? filteredOptions.map((opt, index) => (
                <li
                  key={opt.id}
                  className={cn(
                    "cursor-pointer px-3 py-2 hover:bg-accent",
                    highlightedIndex === index && "bg-accent"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => addCategory(opt)}
                >
                  {opt.label}
                </li>
              ))
            : canCreate && (
                <li
                  className="cursor-pointer px-3 py-2 italic text-muted-foreground hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => createCategory(query)}
                >
                  Create “{query}”
                </li>
              )}
        </ul>
      )}
    </div>
  );
}

type MultiSelectFieldProps = {
  name: string;
  label: string;
  defaultValue?: string[];
} & CategoryInputProps;

export const MultiSelectField = ({
  label,
  name,
  defaultValue,
  options,
  onChange,
  ...props
}: Omit<MultiSelectFieldProps, "value">) => {
  const [value, setValue] = React.useState<string[]>(defaultValue || []);

  const handleChange = (value: string[]) => {
    setValue(value);
    if (onChange) onChange(value);
  };
  return (
    <Field name={name} label={label}>
      <input type="hidden" name={name} value={value} />
      <MultiSelectInput
        {...props}
        options={options}
        onChange={handleChange}
        value={value}
      />
    </Field>
  );
};
