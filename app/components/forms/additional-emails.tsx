import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type AdditionalEmailsProps = {
  /** Addresses already on the player, excluding the primary. */
  defaultValue?: string[];
};

// Players are usually children, so the address on file belongs to a parent —
// and there is often a second one who wants the same emails. Every email the
// system sends to a player goes to all of these as well as the primary.
//
// Rows are uncontrolled (defaultValue) so typing doesn't re-render the list;
// only adding and removing is state. Each row keeps a stable key, because
// indexing by position makes React reuse the wrong input's DOM node when a
// row above it is removed — the classic symptom being a removed address
// reappearing in the row below.
let nextRowId = 0;

export const AdditionalEmails: React.FC<AdditionalEmailsProps> = ({
  defaultValue = [],
}) => {
  const [rows, setRows] = useState<{ id: number; value: string }[]>(() =>
    defaultValue.map((value) => ({ id: nextRowId++, value })),
  );

  const add = () => setRows((current) => [...current, { id: nextRowId++, value: "" }]);
  const remove = (id: number) =>
    setRows((current) => current.filter((row) => row.id !== id));

  return (
    <div className="space-y-2 w-full flex flex-col text-foreground">
      <span className="text-sm font-medium text-gray-300">
        Additional emails
      </span>

      {rows.map((row) => (
        <div key={row.id} className="flex flex-row gap-2 items-center">
          <Input
            name="additionalEmails"
            type="email"
            placeholder="e.g. the other parent's email"
            defaultValue={row.value}
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Remove this email"
            className="text-destructive hover:text-destructive h-9 w-9 p-0 shrink-0"
            onClick={() => remove(row.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-4 h-4" />
          Add another email
        </Button>
      </div>

      <p className="text-xs text-muted">
        Everything we send to this player goes to these addresses as well as the
        one above — useful when both parents want to be kept informed.
      </p>
    </div>
  );
};
