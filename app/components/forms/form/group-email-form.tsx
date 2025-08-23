import { Field } from "~/components/forms/field";
import { SerializedEditorState } from "lexical";
import { useState } from "react";
import { SelectField } from "../select";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";

type LibraryItemForm = {
  libraryItem?: any;
};

export const GroupEmailForm: React.FC<LibraryItemForm> = ({ libraryItem }) => {
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
            options={[{ id: "invite", name: "Invite" }]}
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
          <Field name="description" label="Description">
            <Textarea
              name="description"
              className="h-60"
              defaultValue={`<p>Dear Parent/Guardian,</p>

<p>We are excited to invite your son {{name}} to take part in our Excel Programme, running from October through February.</p>

<p>This programme is designed specifically to bridge the gap between community rugby and scholarship level performance, providing players with the technical skills, game understanding, and physical development needed to succeed at the next stage of their rugby journey.</p>

<p>Please Click the link below to accept the invitation to join the programme and provide us with some key information.</p>
`}
            />
          </Field>
        </div>
      </div>
    </div>
  );
};
