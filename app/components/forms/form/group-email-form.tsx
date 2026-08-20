import { Field } from "~/components/forms/field";
import { SelectField } from "../select";
import { Input } from "~/components/ui/input";
import { RichTextField } from "../rich-text";

type GroupEmailFormProps = {
  libraryItem?: any;
  defaultTestEmail?: string;
  recipientCount?: number;
  memberCount?: number;
};

const DEFAULT_BODY = `<p>Dear Parent/Guardian,</p>

<p>We are excited to invite your son {{name}} to take part in our Excel Programme, running from October through February.</p>

<p>This programme is designed specifically to bridge the gap between community rugby and scholarship level performance, providing players with the technical skills, game understanding, and physical development needed to succeed at the next stage of their rugby journey.</p>

<p>Please Click the link below to accept the invitation to join the programme and provide us with some key information.</p>
`;

export const GroupEmailForm: React.FC<GroupEmailFormProps> = ({
  libraryItem,
  defaultTestEmail,
  recipientCount,
  memberCount,
}) => {
  const withoutEmail = (memberCount ?? 0) - (recipientCount ?? 0);

  return (
    <div className="flex gap-4 flex-col p-4">
      {libraryItem && (
        <input type="hidden" name="attributeId" value={libraryItem.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <SelectField
            name="type"
            label="Type"
            defaultValue="invite"
            options={[
              { id: "invite", name: "Invite" },
              { id: "reminder", name: "Reminder" },
            ]}
          />
        </div>
        <div className="flex flex-row w-full gap-5">
          <Field name="subject" label="Subject">
            <Input
              name="subject"
              placeholder="Enter Subject"
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>

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
          Choose <strong className="text-white">Invite</strong> to include
          accept/reject buttons — each player gets their own invitation link.
          Choose <strong className="text-white">Reminder</strong> to send the
          message on its own. Use <code>{"{{name}}"}</code> to insert each
          player&apos;s name in the body or footer.
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
          {recipientCount ?? 0} group member
          {recipientCount === 1 ? "" : "s"}.
          {withoutEmail > 0 && (
            <>
              {" "}
              {withoutEmail} member{withoutEmail === 1 ? " has" : "s have"} no
              email address on file and will be missed.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
