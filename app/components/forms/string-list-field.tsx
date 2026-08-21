import React, { useState } from "react";
import { X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Field } from "./field";

/**
 * Editable list of free-text items, submitted as one newline-separated hidden
 * field. Deliberately not the comma-joined `StringArrayInput` used by the
 * drills library — these items are whole sentences that may contain commas,
 * and a newline cannot be typed into the single-line input, so splitting on it
 * is unambiguous.
 */
export default function StringListField({
  name,
  label,
  defaultValue = [],
  placeholder = "Type an option and press Enter",
  description,
}: {
  name: string;
  label: string;
  defaultValue?: string[];
  placeholder?: string;
  description?: string;
}) {
  const [value, setValue] = useState("");
  const [items, setItems] = useState<string[]>(defaultValue);

  const addItem = () => {
    const trimmed = value.trim();
    if (trimmed === "" || items.includes(trimmed)) return;
    setItems([...items, trimmed]);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    // The list sits inside the page's form — Enter must not submit it.
    e.preventDefault();
    addItem();
  };

  return (
    <Field name={name} label={label}>
      <input type="hidden" name={name} value={items.join("\n")} />
      <div className="space-y-3">
        <div className="flex flex-row gap-2">
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
          <Button type="button" variant="secondary" onClick={addItem}>
            Add
          </Button>
        </div>

        {description && <p className="text-xs text-muted">{description}</p>}

        <div className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <div
              key={`${name}-${idx}`}
              className="flex items-center justify-between gap-2 bg-card border border-gray-600 rounded-md px-3 py-2 text-sm text-foreground"
            >
              <span>{item}</span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                aria-label={`Remove ${item}`}
                className="h-5 w-5 p-0 rounded-full shrink-0"
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Field>
  );
}
