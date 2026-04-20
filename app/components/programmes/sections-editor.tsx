import { useState } from "react";
import { ProgrammeSection } from "~/types";
import { RichTextEditor } from "~/components/forms/rich-text";
import { ImageUpload } from "~/components/forms/image-upload";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ArrowUp, ArrowDown, Trash2, Type, ImageIcon } from "lucide-react";

type SectionsEditorProps = {
  defaultSections?: ProgrammeSection[];
};

export const SectionsEditor: React.FC<SectionsEditorProps> = ({
  defaultSections = [],
}) => {
  const [sections, setSections] = useState<ProgrammeSection[]>(
    defaultSections && defaultSections.length > 0 ? defaultSections : []
  );

  const addTextSection = () => {
    setSections([...sections, { type: "text", content: "" }]);
  };

  const addImageSection = () => {
    setSections([...sections, { type: "image", url: "", caption: "" }]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSections(updated);
  };

  const updateSection = (index: number, updates: Partial<ProgrammeSection>) => {
    setSections(
      sections.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-gray-300">
        Page Sections
      </label>

      {/* Hidden input that serialises sections as JSON */}
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />

      {sections.map((section, index) => (
        <Card key={index} className="border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted uppercase tracking-wide">
              {section.type === "text" ? "Text block" : "Image"} &middot;{" "}
              {index + 1} of {sections.length}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveSection(index, "up")}
                disabled={index === 0}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveSection(index, "down")}
                disabled={index === sections.length - 1}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSection(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {section.type === "text" && (
            <RichTextEditor
              value={section.content}
              onChange={(html) => updateSection(index, { content: html })}
              placeholder="Write section content..."
            />
          )}

          {section.type === "image" && (
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Paste image URL"
                value={section.url}
                onChange={(e) => updateSection(index, { url: e.target.value })}
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
              {section.url && (
                <img
                  src={section.url}
                  alt={section.caption || ""}
                  className="w-full aspect-video object-cover rounded-md"
                />
              )}
              <Input
                placeholder="Caption (optional)"
                value={section.caption || ""}
                onChange={(e) =>
                  updateSection(index, { caption: e.target.value })
                }
                className="bg-card border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
          )}
        </Card>
      ))}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTextSection}
          className="gap-2"
        >
          <Type className="w-4 h-4" />
          Add Text Section
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addImageSection}
          className="gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          Add Image Section
        </Button>
      </div>
    </div>
  );
};
