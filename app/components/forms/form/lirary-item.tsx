import { Input } from "~/components/ui/input";
import { Field } from "~/components/forms/field";
import { Editor } from "~/components/ui/blocks/editor-00/editor";
import { SerializedEditorState } from "lexical";
import { useState } from "react";
import { Textarea } from "~/components/ui/textarea";

type LibraryItemForm = {
  libraryItem?: any;
};

const initialValue = undefined;

export const LibraryItemForm: React.FC<LibraryItemForm> = ({ libraryItem }) => {
  const [editorState, setEditorState] =
    useState<SerializedEditorState>(initialValue);

  return (
    <div className="flex gap-4 flex-col p-4">
      {libraryItem && (
        <input type="hidden" name="attributeId" value={libraryItem.id} />
      )}
      <div className="flex flex-col w-full gap-5">
        <div className="flex flex-row w-full gap-5">
          <Field name="name" label="Name">
            <Input
              name="name"
              placeholder="Enter Name for Drill/Game/Skill"
              defaultValue={libraryItem?.name}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>
        <div>
          <Field name="video-url" label="Video Url">
            <Input
              name="view-url"
              placeholder="Link to video"
              defaultValue={libraryItem?.videoUrl}
              className="bg-card border-gray-600 text-white placeholder:text-gray-400"
            />
          </Field>
        </div>

        <div className="text-foreground text-sm">
          <Field name="description" label="Description">
            <Textarea name="description" />
          </Field>
        </div>
      </div>
    </div>
  );
};
