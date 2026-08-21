import { useState } from "react";
import { Field } from "~/components/forms/field";
import { SelectField } from "../select";
import { Input } from "~/components/ui/input";
import { RichTextField } from "../rich-text";
import StringListField from "../string-list-field";
import {
  DEFAULT_ACCEPT_COMPLETE_MESSAGE,
  DEFAULT_ACCEPT_PAGE_CONTENT,
  DEFAULT_REJECT_COMPLETE_MESSAGE,
  DEFAULT_REJECT_PAGE_CONTENT,
  DEFAULT_REJECT_REASONS,
} from "~/services/inviteContent";

type GroupEmailFormProps = {
  libraryItem?: any;
  defaultTestEmail?: string;
  recipientCount?: number;
  memberCount?: number;
};

const DEFAULT_FOOTER = `
<p>We’re really looking forward to welcoming {{name}} to Excel.</p>

<p>Your journey. Your opportunity.</p>

<p>Kind regards,</p>

<p>St Helens RLFC Excel Programme</p>
`;

const DEFAULT_BODY = `<p>Dear Parent/Guardian,</p>

<p>Following the recent LDP 14+ Tri-Series, our coaching team were impressed with {{name}}’s performances, attitude and approach throughout the programme.</p>

<p>As a result, we’re delighted to offer {{name}} a place on the St Helens RLFC Excel Programme.</p>

<p>This invitation recognises the potential we have seen in them and gives them an opportunity to continue developing, challenge themselves and prepare for the next stage of their rugby journey.</p>
<hr>
<h2>The Excel Journey</h2>

<p><strong>3 phases. 1 clear goal — develop, challenge and prepare.</strong></p>

<h3>🏗️ Foundation | October–November</h3>
<p>Weekly Wednesday training focused on building core skills, good habits and understanding the standards of Excel.</p>

<h3>🔄 Touchpoints | January–April</h3>
<p>Monthly check-ins to track progress, maintain accountability and keep development moving forward.</p>

<h3>⚡ Performance | April–June</h3>
<p>Weekly training where the intensity increases, players apply what they’ve learned and have opportunities to integrate with the current scholars.</p>

<p><strong>Every phase is designed to challenge players, track their progress and help them take the next step.</strong></p>
<hr>
<h2>Accept or Decline Your Place</h2>

<p>Please confirm below wether or not {{name}} would like to accept their place on the Excel Programme.</p>

<p>Please use the options below to confirm your decision:</p>
`;

export const GroupEmailForm: React.FC<GroupEmailFormProps> = ({
  libraryItem,
  defaultTestEmail,
  recipientCount,
  memberCount,
}) => {
  const [type, setType] = useState<string>("invite");
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
            onValueChange={(value) => setType(value)}
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
            defaultValue={DEFAULT_FOOTER}
            variables={{ name: "", email: "" }}
          />
        </div>

        <p className="text-xs text-muted">
          Choose <strong className="text-white">Invite</strong> to include
          accept/reject buttons — each player gets their own invitation link.
          Choose <strong className="text-white">Reminder</strong> to send the
          message on its own. Use <code>{"{{name}}"}</code> to insert each
          player&apos;s name in the body or footer, and the{" "}
          <strong className="text-white">Section</strong> button to break the
          email into bands of alternating background colour.
        </p>

        {/*
          The pages behind the accept and reject buttons. Only an invite has
          those buttons, so this whole section is irrelevant to a reminder.
          Rendered rather than unmounted so the fields still submit their
          defaults if someone switches type back and forth.
        */}
        <div className={type === "invite" ? "contents" : "hidden"}>
          <div className="border-t border-gray-600 pt-5 mt-2">
            <h3 className="text-white text-base font-bold">Invitation pages</h3>
            <p className="text-xs text-muted mt-1">
              What parents see after clicking the buttons in the email. This
              wording is saved onto each invitation as it is sent, so links
              already out there keep the text they were sent with.
            </p>
          </div>

          <div className="text-foreground text-sm">
            <RichTextField
              name="acceptPageContent"
              label="Accept page — intro"
              defaultValue={DEFAULT_ACCEPT_PAGE_CONTENT}
              variables={{ name: "" }}
            />
          </div>

          <Field
            name="acceptCompleteMessage"
            label="Accept page — confirmation message"
          >
            <Input
              name="acceptCompleteMessage"
              defaultValue={DEFAULT_ACCEPT_COMPLETE_MESSAGE}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>

          <div className="text-foreground text-sm">
            <RichTextField
              name="rejectPageContent"
              label="Reject page — intro"
              defaultValue={DEFAULT_REJECT_PAGE_CONTENT}
              variables={{ name: "" }}
            />
          </div>

          <StringListField
            name="rejectReasons"
            label="Reject page — reasons"
            defaultValue={DEFAULT_REJECT_REASONS}
            placeholder="Add a reason and press Enter"
            description="Offered as a dropdown when a parent declines. An “Other” option with a free-text box is always added."
          />

          <Field
            name="rejectCompleteMessage"
            label="Reject page — confirmation message"
          >
            <Input
              name="rejectCompleteMessage"
              defaultValue={DEFAULT_REJECT_COMPLETE_MESSAGE}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>

        <div className="border-t border-gray-600 pt-5 mt-2" />

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
          copy to the address above so you can preview it. Its accept and reject
          buttons are inactive.{" "}
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
