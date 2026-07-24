import { Field } from "~/components/forms/field";
import {
  ReminderRecipient,
  ReminderRecipientSelector,
} from "~/components/programmes/reminder-recipient-selector";
import { Input } from "~/components/ui/input";
import { RichTextField } from "../rich-text";

type ProgrammeReminderFormProps = {
  defaultTestEmail?: string;
  recipients: ReminderRecipient[];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
};

const DEFAULT_BODY = `<p>Dear Parent/Guardian,</p>

<p>This is a friendly reminder to check that {{name}}'s details are up to date for our upcoming programme.</p>

<p>Please use the button below to review your player profile and confirm which sessions you're available for. If anything has changed, you can update your details, change your availability or withdraw at any time.</p>

<p>If you have any questions, just get in touch.</p>

`;

export const ProgrammeReminderForm: React.FC<ProgrammeReminderFormProps> = ({
  defaultTestEmail,
  recipients,
  selected,
  onSelectedChange,
}) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      <div className="flex flex-col w-full gap-5">
        <ReminderRecipientSelector
          recipients={recipients}
          selected={selected}
          onChange={onSelectedChange}
        />

        <Field name="subject" label="Subject">
          <Input
            name="subject"
            placeholder="Enter Subject"
            defaultValue="Please update your details & availability"
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
        </Field>

        <div className="text-foreground text-sm">
          <RichTextField
            name="description"
            label="Email Body"
            defaultValue={DEFAULT_BODY}
            variables={{ name: "", team: "" }}
          />
        </div>

        <div className="text-foreground text-sm">
          <RichTextField
            name="footer"
            label="Email Footer"
            variables={{ name: "", team: "" }}
          />
        </div>

        <p className="text-xs text-muted">
          Every reminder includes a button linking the recipient to the
          registration page, where they can update their player profile, change
          their availability or withdraw. Use <code>{"{{name}}"}</code> to
          insert each member's name and <code>{"{{team}}"}</code> to insert
          their assigned team, in the body or footer. When we don't have a name
          on file (invited but not yet registered) <code>{"{{name}}"}</code>{" "}
          falls back to "there".
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
          <strong className="text-white">Send reminder</strong> emails only the
          recipients you've selected above.
        </p>
      </div>
    </div>
  );
};
