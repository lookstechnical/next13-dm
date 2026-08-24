/**
 * vCard 3.0 export.
 *
 * 3.0 rather than 4.0 because it's what iOS and Android both import without
 * complaint — 4.0 support is patchier on exactly the phones a coach will be
 * using.
 */

/** Commas, semicolons and backslashes are structural in vCard values. */
const escapeValue = (value: string) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/**
 * Split a display name into vCard's family/given fields.
 *
 * Last word is the surname, everything before it the forename(s). Wrong for
 * some names, but the FN line below carries the name exactly as entered, and
 * that's what phones actually display.
 */
const structuredName = (name: string) => {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "", given: "" };
  if (parts.length === 1) return { family: parts[0], given: "" };
  return {
    family: parts[parts.length - 1],
    given: parts.slice(0, -1).join(" "),
  };
};

export type VCardContact = {
  name: string;
  phone: string;
  /** Written to ORG so the contacts app groups them, e.g. the group name. */
  organisation?: string;
  note?: string;
};

export const buildVCards = (contacts: VCardContact[]): string =>
  contacts
    .map((contact) => {
      const { family, given } = structuredName(contact.name);
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeValue(family)};${escapeValue(given)};;;`,
        `FN:${escapeValue(contact.name)}`,
        `TEL;TYPE=CELL:${escapeValue(contact.phone)}`,
      ];
      if (contact.organisation) {
        lines.push(`ORG:${escapeValue(contact.organisation)}`);
      }
      if (contact.note) {
        lines.push(`NOTE:${escapeValue(contact.note)}`);
      }
      lines.push("END:VCARD");
      return lines.join("\r\n");
    })
    // Spec requires CRLF, and a trailing one so the last card is terminated.
    .join("\r\n") + "\r\n";
