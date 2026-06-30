import { Field } from "~/components/forms/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { RichTextField } from "../rich-text";

type ProgrammeInviteFormProps = {
  defaultTestEmail?: string;
};

const DEFAULT_BODY = `<p>Dear Parent/Guardian,</p>

<p>We'd like to invite {{name}} to register for our upcoming programme.</p>

<p>Please use the button below to complete registration and let us know which sessions they're available for. This invitation is linked to the email address this message was sent to.</p>

<p>If you have any questions, just get in touch.</p>

`;

export const ProgrammeInviteForm: React.FC<ProgrammeInviteFormProps> = ({
  defaultTestEmail,
}) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      <div className="flex flex-col w-full gap-5">
        <Field name="emails" label="Invite emails">
          <Textarea
            name="emails"
            rows={4}
            placeholder={"player1@example.com\nplayer2@example.com"}
            className="bg-card border-gray-600 text-white placeholder:text-gray-400"
          />
        </Field>
        <p className="text-xs text-muted -mt-3">
          Enter one or more email addresses, separated by commas, spaces or new
          lines. Each address is added to the registration allow-list and sent
          an invitation.
        </p>

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
          Every invitation includes a button linking the recipient to the
          programme's registration page. Use <code>{"{{name}}"}</code> in the
          body or footer — for invitations it falls back to "there" when we don't
          have a name on file.
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
          copy to the address above so you can preview it — it does{" "}
          <strong className="text-white">not</strong> add anyone to the
          allow-list.{" "}
          <strong className="text-white">Send invitations</strong> adds every
          address above to the allow-list and emails them the invitation.
        </p>
      </div>
    </div>
  );
};
