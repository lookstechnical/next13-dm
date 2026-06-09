import { Field } from "~/components/forms/field";
import { Input } from "~/components/ui/input";
import { RichTextField } from "../rich-text";

type ProgrammeEmailFormProps = {
  defaultTestEmail?: string;
  recipientCount?: number;
};

const DEFAULT_BODY = `<p>Dear Parent/Guardian,</p>

<p>Thank you for registering your son {{name}} for our upcoming Tri Series programme. We appreciate your interest and are excited to provide this opportunity for players to continue their development and represent the club..</p>

<p>The Tri Series will consist of a series of training sessions and fixtures against local rivals Wigan warriors and Warrington wolves, giving players the chance to develop their skills in a competitive and enjoyable environment while gaining valuable match experience.</p>

<p>Please note that this programme is open to <strong>non-scholarship players only.</strong></p>

<p>We will be in touch with more information and reminders closer to the time</p>

<p>In the meantime, if your son's availability changes, or if they are no longer able to take part, please use the button provided below to update their availability or withdraw from the programme at any point.</p>

`;

export const ProgrammeEmailForm: React.FC<ProgrammeEmailFormProps> = ({
  defaultTestEmail,
  recipientCount,
}) => {
  return (
    <div className="flex gap-4 flex-col p-4">
      <div className="flex flex-col w-full gap-5">
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
          Every email includes a button linking the member to their registration
          page, where they can update their availability or withdraw. Use{" "}
          <code>{"{{name}}"}</code> in the body or footer to insert each
          member's name.
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
          <strong className="text-white">Send to all</strong> emails all{" "}
          {recipientCount ?? 0} registered member
          {recipientCount === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
  );
};
