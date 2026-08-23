import { Field } from "~/components/forms/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Player } from "~/types";
import { fromTotalInches } from "~/utils/height";
import {
  ProgrammeFieldKey,
  parseRequestedFields,
  parseRequiredFields,
} from "~/utils/programme-fields";

/**
 * The optional details a programme opted into asking for, rendered on the
 * public registration form.
 *
 * Deliberately separate from PlayerForm: that form is shared with the invite
 * flow and the dashboard, none of which know about programmes. Keeping this
 * beside it means a programme's configuration can't leak into forms that have
 * nothing to do with programmes.
 */
type ExtraProfileFields = {
  requestedFields?: string[] | null;
  requiredFields?: string[] | null;
  player?: Partial<Player> | null;
  /**
   * Raw form values echoed back after a rejected submit. A height that failed
   * validation has no stored number to prefill from, so without this the boxes
   * come back empty and the registrant has to retype an answer they can't see
   * the problem with.
   */
  rawValues?: Record<string, string> | null;
  errors?: any;
};

/**
 * Marks a label as required. The asterisk is the only cue the registrant gets
 * before submitting, so it goes on the label rather than relying on the
 * browser's own validation bubble — which `required` alone would give us, but
 * which never fires when a field is scrolled out of view.
 */
const withRequired = (label: string, required: boolean) =>
  required ? `${label} *` : label;

const inputClass =
  "bg-card border-gray-600 text-white placeholder:text-gray-400";

/** The catalogue keys this component renders; PlayerForm covers the others. */
const OWNED_KEYS: ProgrammeFieldKey[] = [
  "school",
  "motherHeight",
  "fatherHeight",
  "medicalConditions",
];

/**
 * Feet and inches as two boxes. A single "5'11" text field reads nicely but
 * parses badly — people write 5'11, 5 11, 5ft11in and 511 — so the split boxes
 * take the ambiguity out and are recombined server-side by toTotalInches.
 */
const HeightField: React.FC<{
  name: string;
  label: string;
  total?: number | null;
  required?: boolean;
  rawValues?: Record<string, string> | null;
  errors?: any;
}> = ({ name, label, total, required, rawValues, errors }) => {
  const stored = fromTotalInches(total);
  const feet = rawValues?.[`${name}Feet`] ?? stored.feet;
  const inches = rawValues?.[`${name}Inches`] ?? stored.inches;

  return (
    <Field name={name} label={withRequired(label, !!required)} errors={errors}>
      <div className="flex flex-row gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Input
            name={`${name}Feet`}
            type="number"
            min={3}
            max={8}
            placeholder="5"
            defaultValue={feet}
            className={inputClass}
          />
          <span className="text-sm text-muted">ft</span>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Input
            name={`${name}Inches`}
            type="number"
            min={0}
            max={11}
            placeholder="11"
            defaultValue={inches}
            className={inputClass}
          />
          <span className="text-sm text-muted">in</span>
        </div>
      </div>
    </Field>
  );
};

export const ExtraProfileFields: React.FC<ExtraProfileFields> = ({
  requestedFields,
  requiredFields,
  player,
  rawValues,
  errors,
}) => {
  const requested = parseRequestedFields(requestedFields);
  const required = parseRequiredFields(requestedFields, requiredFields);
  const asks = (key: ProgrammeFieldKey) => requested.includes(key);
  const needs = (key: ProgrammeFieldKey) => required.includes(key);

  // Only the fields this block owns — the rest of the catalogue is rendered by
  // PlayerForm. Checking the intersection rather than `requested.length` keeps
  // the heading from appearing above nothing.
  if (!OWNED_KEYS.some(asks)) return null;

  return (
    <div className="flex flex-col gap-5 pt-5 mt-5 border-t border-border">
      <div>
        <h3 className="text-sm font-medium text-white">
          A few extra details
        </h3>
        <p className="text-xs text-muted mt-1">
          {required.length > 0
            ? "Fields marked * are required."
            : "Optional — leave anything blank if you'd rather not say."}
        </p>
      </div>

      {(asks("motherHeight") || asks("fatherHeight")) && (
        <div className="flex flex-col md:flex-row w-full gap-5">
          {asks("motherHeight") && (
            <HeightField
              name="motherHeight"
              label="Mother's Height"
              total={player?.motherHeightInches}
              required={needs("motherHeight")}
              rawValues={rawValues}
              errors={errors}
            />
          )}
          {asks("fatherHeight") && (
            <HeightField
              name="fatherHeight"
              label="Father's Height"
              total={player?.fatherHeightInches}
              required={needs("fatherHeight")}
              rawValues={rawValues}
              errors={errors}
            />
          )}
        </div>
      )}

      {asks("school") && (
        <Field
          name="school"
          label={withRequired("School", needs("school"))}
          errors={errors}
        >
          <Input
            name="school"
            placeholder="Enter the school you attend"
            defaultValue={rawValues?.school ?? player?.school ?? ""}
            className={inputClass}
          />
        </Field>
      )}

      {asks("medicalConditions") && (
        <Field
          name="medicalConditions"
          label={withRequired("Medical Conditions", needs("medicalConditions"))}
          errors={errors}
        >
          <Textarea
            name="medicalConditions"
            rows={4}
            placeholder="Allergies, injuries, or anything else our coaches and first aiders should know about."
            defaultValue={
              rawValues?.medicalConditions ?? player?.medicalConditions ?? ""
            }
            className={inputClass}
          />
        </Field>
      )}
    </div>
  );
};
