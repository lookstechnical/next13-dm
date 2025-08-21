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
              placeholder="Enter Subjecte"
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>

        <div className="text-foreground text-sm">
          <Field name="description" label="Description">
            <Textarea name="description" className="h-60" />
          </Field>
        </div>
      </div>
    </div>
  );
};
