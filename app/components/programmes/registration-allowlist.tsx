import { useFetcher } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { Trash2, Plus, Mail } from "lucide-react";
import { ProgrammeAllowedEmail } from "~/types";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type RegistrationAllowlistProps = {
  programmeId: string;
  allowedEmails: ProgrammeAllowedEmail[];
  /** Whether the registration deadline has already passed. */
  deadlinePassed: boolean;
};

export const RegistrationAllowlist: React.FC<RegistrationAllowlistProps> = ({
  programmeId,
  allowedEmails,
  deadlinePassed,
}) => {
  const addFetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input once an add succeeds.
  const adding = addFetcher.state !== "idle";
  useEffect(() => {
    if (addFetcher.state === "idle" && addFetcher.data) {
      formRef.current?.reset();
    }
  }, [addFetcher.state, addFetcher.data]);

  return (
    <div>
      <p className="text-sm text-muted mb-4">
        {deadlinePassed
          ? "Registration is closed. Only the people listed below can still register — they must use the email address you add here."
          : "Once the registration deadline passes, only the people listed below will be able to register. Add anyone you want to let through early."}
      </p>

      <addFetcher.Form
        method="post"
        ref={formRef}
        className="flex flex-col sm:flex-row gap-2 mb-4"
      >
        <input type="hidden" name="intent" value="addAllowedEmail" />
        <input type="hidden" name="id" value={programmeId} />
        <Input
          name="email"
          type="email"
          required
          placeholder="player@example.com"
          className="bg-card border-input text-white placeholder:text-muted sm:max-w-xs"
        />
        <Button type="submit" variant="outline" disabled={adding}>
          <Plus className="w-4 h-4" />
          {adding ? "Adding..." : "Add email"}
        </Button>
      </addFetcher.Form>

      {allowedEmails.length === 0 ? (
        <p className="text-sm text-muted">No emails added yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/50 border border-border rounded-md">
          {allowedEmails.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-white min-w-0">
                <Mail className="w-4 h-4 text-muted flex-shrink-0" />
                <span className="truncate">{entry.email}</span>
              </span>
              <RemoveButton id={entry.id} email={entry.email} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Each row gets its own fetcher so removing one doesn't disable the others.
const RemoveButton: React.FC<{ id: string; email: string }> = ({
  id,
  email,
}) => {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="removeAllowedEmail" />
      <input type="hidden" name="allowedEmailId" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive h-8 w-8 p-0"
        disabled={fetcher.state !== "idle"}
        onClick={(e) => {
          if (!confirm(`Remove ${email} from the allow-list?`)) {
            e.preventDefault();
          }
        }}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </fetcher.Form>
  );
};
