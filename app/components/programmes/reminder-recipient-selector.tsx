import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

export type ReminderRecipient = {
  email: string;
  name: string;
  registered: boolean;
};

type ReminderRecipientSelectorProps = {
  recipients: ReminderRecipient[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

// Lets the sender pick exactly which players/invitees the reminder goes to.
// Selection lives in the parent (so the footer's send button can read the
// count); this component renders the filterable list and keeps hidden inputs
// in sync so the current selection is submitted with the form — regardless of
// what the search box is currently showing.
export const ReminderRecipientSelector: React.FC<
  ReminderRecipientSelectorProps
> = ({ recipients, selected, onChange }) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = q
    ? recipients.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      )
    : recipients;

  const toggle = (email: string) => {
    const next = new Set(selected);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    onChange(next);
  };

  const allShownSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.email));

  const toggleAllShown = () => {
    const next = new Set(selected);
    if (allShownSelected) {
      filtered.forEach((r) => next.delete(r.email));
    } else {
      filtered.forEach((r) => next.add(r.email));
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden inputs carry the real selection to the server, independent of
          the visible/filtered rows below. */}
      {[...selected].map((email) => (
        <input key={email} type="hidden" name="recipients" value={email} />
      ))}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">
          Recipients{" "}
          <span className="text-muted">
            ({selected.size} of {recipients.length} selected)
          </span>
        </p>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={toggleAllShown}
            className="text-xs text-primary hover:underline"
          >
            {allShownSelected ? "Deselect" : "Select"} all{q ? " shown" : ""}
          </button>
        )}
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        className="bg-card border-gray-600 text-white placeholder:text-gray-400"
      />

      <div className="flex flex-col gap-1 max-h-72 overflow-auto rounded-md border border-border p-2">
        {recipients.length === 0 && (
          <p className="text-sm text-muted p-2">
            No registered members or invited emails for this programme yet.
          </p>
        )}
        {recipients.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted p-2">
            No recipients match "{query}".
          </p>
        )}
        {filtered.map((r) => (
          <label
            key={r.email}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-card/50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(r.email)}
              onChange={() => toggle(r.email)}
              className="w-4 h-4 shrink-0"
            />
            <div className="flex-grow min-w-0">
              <p className="text-sm text-white truncate">
                {r.name || r.email}
              </p>
              {r.name && (
                <p className="text-xs text-muted truncate">{r.email}</p>
              )}
            </div>
            <Badge
              variant="outline"
              className="uppercase text-[10px] shrink-0"
            >
              {r.registered ? "Registered" : "Invited"}
            </Badge>
          </label>
        ))}
      </div>
    </div>
  );
};
