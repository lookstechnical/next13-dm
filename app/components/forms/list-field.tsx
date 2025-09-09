import React, { useState } from "react";
import { X } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Field } from "./field";

type StringArrayInput = {
  name: string;
  label: string;
  defaultValue: string[];
};

export default function StringArrayInput({
  name,
  label,
  defaultValue,
}: StringArrayInput) {
  const [value, setValue] = useState("");
  const [items, setItems] = useState<string[]>(defaultValue);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim() !== "") {
      e.preventDefault();
      if (!items.includes(value.trim())) {
        setItems([...items, value.trim()]);
      }
      setValue("");
    }
  };

  const removeItem = (item: string) => {
    setItems(items.filter((i) => i !== item));
  };

  return (
    <Field name={name} label={label}>
      <input type="hidden" name={name} value={items} />
      <div className="space-y-3">
        <Input
          placeholder="Type something and press Enter"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 bg-gray-200 text-gray-800 rounded-full px-3 py-1 text-sm shadow-sm"
            >
              {item}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-4 w-4 p-0 rounded-full hover:bg-gray-300"
                onClick={() => removeItem(item)}
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
