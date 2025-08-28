import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { Editor } from "~/components/ui/blocks/editor-00/editor";
import { SerializedEditorState } from "lexical";
import { useState } from "react";
import { Textarea } from "~/components/ui/textarea";
import { RichTextField } from "../rich-text";
import { DrillField } from "../drill";

type LibraryItemForm = {
  libraryItem?: any;
};

const initialValue = undefined;

export const LibraryItemForm: React.FC<LibraryItemForm> = ({ libraryItem }) => {
  return (
    <div className="flex gap-4 flex-col p-4 text-foreground">
      {libraryItem && (
        <input type="hidden" name="attributeId" value={libraryItem.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <DrillField />
        </div>
        <div className="text-foreground text-sm">
          <RichTextField name="description" label="Description" />
        </div>

        <div className="flex flex-row w-full gap-5">
          <Field name="assignedTo" label="Assigned to">
            <Input
              name="assignedTo"
              placeholder="Who is responsible"
              defaultValue={libraryItem?.assignedTo}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
          <Field name="duration" label="Duration">
            <Input
              name="duration"
              placeholder="Duration"
              defaultValue={libraryItem?.duration}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
      </div>
    </div>
  );
};
