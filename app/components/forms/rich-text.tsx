"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

import { Toggle } from "../ui/toggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { TooltipProvider } from "../ui/tooltip";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Field } from "./field";

// ——— icons (you can swap for your own) ———
function IconBold() {
  return <span style={{ fontWeight: 700 }}>B</span>;
}
function IconItalic() {
  return <span style={{ fontStyle: "italic" }}>I</span>;
}
function IconUnderline() {
  return <span style={{ textDecoration: "underline" }}>U</span>;
}
function IconStrike() {
  return <span style={{ textDecoration: "line-through" }}>S</span>;
}
function IconOL() {
  return <span>1.</span>;
}
function IconUL() {
  return <span>•</span>;
}
function IconQuote() {
  return <span>❝</span>;
}
function IconCode() {
  return <span>{`</>`}</span>;
}
function IconUndo() {
  return <span>↶</span>;
}
function IconRedo() {
  return <span>↷</span>;
}
function IconLink() {
  return <span>🔗</span>;
}
function IconClear() {
  return <span>✕</span>;
}
function IconH() {
  return <span>H</span>;
}

export type RichTextEditorProps = {
  /** HTML string */
  value?: string;
  /** Called with the latest HTML whenever content changes */
  onChange?: (html: string) => void;
  /** Optional placeholder */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional className for wrapper */
  className?: string;
  variables?: Record<string, string>;
};

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something…",
  disabled = false,
  className,
  variables,
}: RichTextEditorProps) {
  const editor = useEditor(
    {
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          bulletList: { keepMarks: true, keepAttributes: true },
          orderedList: { keepMarks: true, keepAttributes: true },
          heading: { levels: [1, 2, 3, 4] },
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: value || "<p></p>",
      onUpdate({ editor }) {
        const html = editor.getHTML();
        onChange?.(html);
      },
    },
    [disabled]
  );

  // Keep TipTap in sync if parent `value` changes externally
  React.useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value != null && value !== current) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // Link prompt (simple)
  const setLink = React.useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste link URL", prev ?? "https://");
    if (url === null) return; // user cancelled
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, any>) =>
    editor.isActive(name, attrs);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-muted bg-background p-1">
          <Toggle
            size="sm"
            pressed={isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <IconBold />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <IconItalic />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isActive("underline")}
            onPressedChange={() =>
              editor.chain().focus().toggleUnderline().run()
            }
            aria-label="Underline"
          >
            <IconUnderline />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isActive("strike")}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <IconStrike />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
              >
                <IconH /> Heading
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {[1, 2, 3, 4].map((level) => (
                <DropdownMenuItem
                  key={level}
                  onSelect={(e) => {
                    e.preventDefault();
                    editor.chain().focus().toggleHeading({ level }).run();
                  }}
                >
                  H{level}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setParagraph().run();
                }}
              >
                Paragraph
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Toggle
            size="sm"
            pressed={isActive("bulletList")}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            aria-label="Bulleted list"
          >
            <IconUL />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isActive("orderedList")}
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            aria-label="Numbered list"
          >
            <IconOL />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isActive("blockquote")}
            onPressedChange={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            aria-label="Quote"
          >
            <IconQuote />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isActive("codeBlock")}
            onPressedChange={() =>
              editor.chain().focus().toggleCodeBlock().run()
            }
            aria-label="Code Block"
          >
            <IconCode />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={setLink}
            aria-label="Add or edit link"
          >
            <IconLink />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            aria-label="Undo"
          >
            <IconUndo />
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            aria-label="Redo"
          >
            <IconRedo />
          </Button>

          <div className="ml-auto" />

          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => editor.commands.clearContent(true)}
            aria-label="Clear"
          >
            <IconClear />
          </Button>

          {variables && Object.keys(variables).length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    <span>➕</span> Insert Var
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.keys(variables).map((key) => (
                    <DropdownMenuItem
                      key={key}
                      onSelect={(e) => {
                        e.preventDefault();
                        editor
                          .chain()
                          .focus()
                          .insertContent(`{{${key}}}`)
                          .run();
                      }}
                    >
                      {key}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Editor surface */}
        <div className="rounded-md border border-muted">
          <EditorContent
            editor={editor}
            className="prose border-muted prose-sm max-w-none dark:prose-invert px-3 py-2 min-h-[200px] *:min-h-[200px]  focus:outline-none"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export const RichTextField = ({
  name,
  label,
  variables,
  placeholder,
  defaultValue = "",
}: {
  placeholder?: string;
  name: string;
  label: string;
  variables?: object;
  defaultValue?: string;
}) => {
  const [html, setHtml] = React.useState<string>(defaultValue);

  return (
    <Field name={name} label={label}>
      <input
        type="hidden"
        defaultValue={defaultValue}
        name={name}
        value={html}
      />
      <RichTextEditor
        html={html}
        onChange={setHtml}
        placeholder={placeholder}
        variables={variables}
      />
    </Field>
  );
};
