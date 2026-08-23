import { useState } from "react";
import { cn } from "~/lib/utils";
import {
  ALWAYS_ON,
  ALWAYS_REQUIRED,
  PROGRAMME_FIELDS,
  ProgrammeFieldKey,
  parseRequestedFields,
  parseRequiredFields,
} from "~/utils/programme-fields";

/**
 * Picks which details the public registration form asks for, and which of those
 * the registrant must actually answer.
 *
 * Stateful because "required" only means something once a field is being asked
 * for at all. The required toggle is unmounted while its field is un-ticked, so
 * it posts nothing and the key can't linger — the server intersects the two
 * lists as well, since an older row may still carry a stale key.
 *
 * Name and email can't be switched off. They aren't decoration: email is how a
 * registrant is looked up and verified in step 1, and a player row without a
 * name is unusable everywhere else in the app. Their checkboxes render disabled
 * and post through hidden inputs, so a save always writes a non-empty
 * requested_fields — which is what lets a null column keep meaning "never
 * configured" rather than "asks for nothing".
 */
type RequestedFieldsEditor = {
  requestedFields?: string[] | null;
  requiredFields?: string[] | null;
};

export const RequestedFieldsEditor: React.FC<RequestedFieldsEditor> = ({
  requestedFields,
  requiredFields,
}) => {
  const [requested, setRequested] = useState<ProgrammeFieldKey[]>(() =>
    parseRequestedFields(requestedFields),
  );
  const [required, setRequired] = useState<ProgrammeFieldKey[]>(() =>
    parseRequiredFields(requestedFields, requiredFields),
  );

  const toggleRequested = (key: ProgrammeFieldKey, checked: boolean) => {
    setRequested((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key),
    );
    // A field that's no longer asked for can't be required.
    if (!checked) setRequired((prev) => prev.filter((k) => k !== key));
  };

  const toggleRequired = (key: ProgrammeFieldKey, checked: boolean) => {
    setRequired((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key),
    );
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-300 mb-2 block">
        Registration Form Fields
      </label>
      <p className="text-xs text-muted mb-3">
        What the public registration form asks for. Tick a field to ask for it,
        then mark it required if the registrant must answer before they can
        continue.
      </p>
      <div className="flex flex-col gap-2">
        {PROGRAMME_FIELDS.map((field) => {
          const isRequested = requested.includes(field.key);
          const locked = ALWAYS_ON.includes(field.key);
          const lockedRequired = ALWAYS_REQUIRED.includes(field.key);

          return (
            <div
              key={field.key}
              className="flex flex-row items-start justify-between gap-4 p-3 rounded border border-border"
            >
              {/* A disabled checkbox posts nothing, so locked fields carry
                  their key through a hidden input instead. */}
              {locked && (
                <input type="hidden" name="requestedFields" value={field.key} />
              )}
              {/* The label wraps only the field's own checkbox — wrapping the
                  whole row would make clicking "Required" toggle this one. */}
              <label
                className={cn(
                  "flex items-start gap-3 flex-grow",
                  locked ? "cursor-default" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  name={locked ? undefined : "requestedFields"}
                  value={field.key}
                  checked={isRequested}
                  disabled={locked}
                  onChange={(e) =>
                    toggleRequested(field.key, e.target.checked)
                  }
                  className="w-4 h-4 mt-0.5"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm text-white">{field.label}</span>
                  <span className="text-xs text-muted">{field.hint}</span>
                </span>
              </label>

              {isRequested && lockedRequired && (
                <span className="text-xs text-muted flex-shrink-0 pt-0.5">
                  Always required
                </span>
              )}
              {isRequested && !lockedRequired && (
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    name="requiredFields"
                    value={field.key}
                    checked={required.includes(field.key)}
                    onChange={(e) =>
                      toggleRequired(field.key, e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-muted">Required</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
