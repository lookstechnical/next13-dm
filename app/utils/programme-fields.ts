/**
 * Every field the public programme registration form can ask for.
 *
 * One list, read by four places: the checkboxes on the programme form, the
 * shared PlayerForm, the extra-details block beside it, and the action that
 * validates and saves. Keeping the keys here rather than in a DB enum means
 * adding a field is a code change, not a migration — see the note in
 * supabase/migrations/20260823_programme_requested_fields.sql.
 */
export type ProgrammeFieldKey =
  | "photo"
  | "name"
  | "email"
  | "mobile"
  | "dateOfBirth"
  | "position"
  | "secondaryPosition"
  | "club"
  | "kit"
  | "school"
  | "motherHeight"
  | "fatherHeight"
  | "medicalConditions";

type ProgrammeFieldDef = {
  key: ProgrammeFieldKey;
  /** Checkbox label on the programme form. */
  label: string;
  /** Why a coach would ask for it — shown under the checkbox. */
  hint: string;
  /**
   * Can't be switched off. Reserved for the two fields the flow itself depends
   * on, not for fields that merely feel important.
   */
  alwaysOn?: boolean;
  /** Can't be made optional. Implies alwaysOn. */
  alwaysRequired?: boolean;
};

/** Catalogue order — drives both the config list and the form. */
export const PROGRAMME_FIELDS: ProgrammeFieldDef[] = [
  {
    key: "photo",
    label: "Profile photo",
    hint: "Helps coaches identify players when they turn up to a session.",
  },
  {
    key: "name",
    label: "Name",
    hint: "Always asked for — a player record can't be created without it.",
    alwaysRequired: true,
  },
  {
    key: "email",
    label: "Email",
    hint: "Always asked for — it's how registrants are identified and verified.",
    alwaysRequired: true,
  },
  {
    key: "mobile",
    label: "Mobile phone",
    hint: "Contact number for the player or their parent.",
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    hint: "Needed to work out age group. Always asked for when an eligible date-of-birth range is set.",
  },
  {
    key: "position",
    label: "Position",
    hint: "The player's main playing position.",
  },
  {
    key: "secondaryPosition",
    label: "Secondary position",
    hint: "An alternative position the player can cover.",
  },
  {
    key: "club",
    label: "Club",
    hint: "The club the player currently plays for.",
  },
  {
    key: "kit",
    label: "Kit sizes",
    hint: "Shirt and shorts sizes, for programmes that hand out kit.",
  },
  {
    key: "school",
    label: "School",
    hint: "The school the player currently attends.",
  },
  {
    key: "motherHeight",
    label: "Mother's height",
    hint: "Feet and inches. Used with the father's height to estimate adult height.",
  },
  {
    key: "fatherHeight",
    label: "Father's height",
    hint: "Feet and inches. Used with the mother's height to estimate adult height.",
  },
  {
    key: "medicalConditions",
    label: "Medical conditions",
    hint: "Free-text box for allergies, injuries and conditions coaches should know about.",
  },
];

const ORDER = PROGRAMME_FIELDS.map((f) => f.key);
const VALID_KEYS = new Set<string>(ORDER);

export const ALWAYS_ON: ProgrammeFieldKey[] = PROGRAMME_FIELDS.filter(
  (f) => f.alwaysOn || f.alwaysRequired,
).map((f) => f.key);

export const ALWAYS_REQUIRED: ProgrammeFieldKey[] = PROGRAMME_FIELDS.filter(
  (f) => f.alwaysRequired,
).map((f) => f.key);

/**
 * What a programme asks for when nobody has configured it — exactly the fields
 * the registration form rendered before it was configurable.
 *
 * Every programme created before this feature has a null `requested_fields`,
 * and reading that as "ask for nothing" would leave their registration form
 * empty. Null therefore means "not configured", not "nothing".
 */
export const DEFAULT_REQUESTED_FIELDS: ProgrammeFieldKey[] = [
  "photo",
  "name",
  "email",
  "mobile",
  "dateOfBirth",
  "position",
  "secondaryPosition",
  "club",
];

/** Matches what the old static step2 schema enforced. */
export const DEFAULT_REQUIRED_FIELDS: ProgrammeFieldKey[] = [
  "name",
  "email",
  "position",
  "club",
];

const sortByCatalogue = (keys: ProgrammeFieldKey[]): ProgrammeFieldKey[] =>
  [...new Set(keys)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

const known = (value?: string[] | null): ProgrammeFieldKey[] =>
  (value || []).filter((key): key is ProgrammeFieldKey => VALID_KEYS.has(key));

/** Whether this programme has ever had its fields configured. */
export const isFieldsConfigured = (requestedFields?: string[] | null): boolean =>
  known(requestedFields).length > 0;

/**
 * The fields to render, narrowed to keys we recognise.
 *
 * A key removed from the catalogue above will still be sitting in
 * `requested_fields` on existing rows; dropping it here means the form quietly
 * stops asking rather than rendering a blank input.
 */
export const parseRequestedFields = (
  value?: string[] | null,
): ProgrammeFieldKey[] => {
  const valid = known(value);
  if (valid.length === 0) return [...DEFAULT_REQUESTED_FIELDS];
  return sortByCatalogue([...ALWAYS_ON, ...valid]);
};

/** Whether a programme asks for a given field. */
export const requestsField = (
  requestedFields: string[] | null | undefined,
  key: ProgrammeFieldKey,
): boolean => parseRequestedFields(requestedFields).includes(key);

/**
 * The fields a registrant must fill in — always a subset of what's asked for.
 *
 * Intersecting here rather than trusting the stored array is what makes
 * un-ticking a field safe: its key may still be sitting in required_fields, and
 * without this the form would enforce a field it never renders, leaving the
 * registrant staring at a submit button that fails with nothing to fix.
 */
export const parseRequiredFields = (
  requestedFields?: string[] | null,
  requiredFields?: string[] | null,
): ProgrammeFieldKey[] => {
  const requested = new Set(parseRequestedFields(requestedFields));
  const base = isFieldsConfigured(requestedFields)
    ? known(requiredFields)
    : [...DEFAULT_REQUIRED_FIELDS];

  return sortByCatalogue([...ALWAYS_REQUIRED, ...base]).filter((key) =>
    requested.has(key),
  );
};

/** Whether a requested field must be filled in. */
export const isFieldRequired = (
  requestedFields: string[] | null | undefined,
  requiredFields: string[] | null | undefined,
  key: ProgrammeFieldKey,
): boolean => parseRequiredFields(requestedFields, requiredFields).includes(key);

/**
 * The fields a specific programme's registration form asks for and enforces.
 *
 * Resolved in one place so the form and the validation can't disagree — the
 * failure mode otherwise is a required field that never renders, which leaves
 * the registrant on a submit button that fails with nothing visible to fix.
 *
 * An eligible date-of-birth range is checked against the submitted date of
 * birth, so setting one implicitly turns that field on and makes it required
 * however the checkboxes are configured.
 */
export const resolveProgrammeFields = (programme?: {
  requestedFields?: string[] | null;
  requiredFields?: string[] | null;
  eligibleDobFrom?: string | null;
  eligibleDobTo?: string | null;
}): { requested: ProgrammeFieldKey[]; required: ProgrammeFieldKey[] } => {
  const requested = parseRequestedFields(programme?.requestedFields);
  const required = parseRequiredFields(
    programme?.requestedFields,
    programme?.requiredFields,
  );

  const enforcesDobRange = !!(
    programme?.eligibleDobFrom || programme?.eligibleDobTo
  );
  if (!enforcesDobRange) return { requested, required };

  return {
    requested: sortByCatalogue([...requested, "dateOfBirth"]),
    required: sortByCatalogue([...required, "dateOfBirth"]),
  };
};
