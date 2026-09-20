import { Field } from "~/components/forms/field";
import {
  EmailRecipient,
  RecipientSelector,
} from "~/components/recipient-selector";
import { Input } from "~/components/ui/input";
import { RichTextField } from "../rich-text";

type GroupMessageFormProps = {
  defaultTestEmail?: string;
  recipients: EmailRecipient[];
  /** Members with no email address on file — they can't be reached at all. */
  withoutEmail: number;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
};

const DEFAULT_BODY = `<p>Dear Parent/Guardian,</p>

<p>Just a quick update for {{name}} ahead of our next session.</p>

<p>If you have any questions, just get in touch.</p>

`;

export const GroupMessageForm: React.FC<GroupMessageFormProps> = ({
  defaultTestEmail,
  recipients,
  withoutEmail,
  selected,
  onSelectedChange,
}) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      <div className="flex flex-col w-full gap-5">
        <RecipientSelector
          recipients={recipients}
          selected={selected}
          onChange={onSelectedChange}
          emptyMessage="No members of this group have an email address on file."
        />

        {withoutEmail > 0 && (
          <p className="text-xs text-muted">
            {withoutEmail} member{withoutEmail === 1 ? " has" : "s have"} no
            email address on file and can&apos;t be emailed.
          </p>
        )}

        <Field name="subject" label="Subject">
          <Input
            name="subject"
            placeholder="Enter Subject"
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
        </Field>

        <div className="text-foreground text-sm">
          <RichTextField
            name="description"
            label="Email Body"
            defaultValue={DEFAULT_BODY}
            variables={{ name: "", email: "" }}
          />
        </div>

        <div className="text-foreground text-sm">
          <RichTextField
            name="footer"
            label="Email Footer"
            variables={{ name: "", email: "" }}
          />
        </div>

        <p className="text-xs text-muted">
          This is a plain message — no accept/reject buttons and no registration
          link. Use <code>{"{{name}}"}</code> to insert each player&apos;s name
          and <code>{"{{email}}"}</code> their email address, in the body or
          footer, and the <strong className="text-white">Section</strong> button
          to break the email into bands of alternating background colour.
        </p>

        <Field name="testEmail" label="Test email address">
          <Input
            name="testEmail"
            type="email"
            defaultValue={defaultTestEmail}
            placeholder="you@example.com"
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
        </Field>

        <p className="text-xs text-muted">
          <strong className="text-white">Send test email</strong> sends a single
          copy to the address above so you can preview it.{" "}
          <strong className="text-white">Send email</strong> goes only to the
          recipients you&apos;ve selected above.
        </p>
      </div>
    </div>
  );
};
