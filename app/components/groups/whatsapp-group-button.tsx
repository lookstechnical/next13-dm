import { Check, Copy, Download, MessageCircle } from "lucide-react";
import React, { useState } from "react";
import { Player } from "~/types";
import { shareOrDownloadFile } from "~/utils/download";
import { partitionByPhone } from "~/utils/phone";
import { buildVCards } from "~/utils/vcard";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

const slugify = (value: string) =>
  value
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "group";

/**
 * Everything needed to stand up a WhatsApp group for a squad.
 *
 * WhatsApp deliberately has no way to create a group from a link or an API —
 * wa.me only opens a one-to-one chat, and the Cloud API doesn't expose consumer
 * groups at all. The group itself has to be made by hand in the app.
 *
 * What actually makes that slow is that WhatsApp can only add people who are
 * already in your phone's contacts, so a coach ends up typing thirty numbers in
 * before they can start. Importing the squad as contacts removes that step,
 * which is the part worth automating.
 */
type WhatsAppGroupButton = {
  players: Player[];
  groupName: string;
};

export const WhatsAppGroupButton: React.FC<WhatsAppGroupButton> = ({
  players,
  groupName,
}) => {
  const [copied, setCopied] = useState(false);
  const [delivery, setDelivery] = useState<"shared" | "downloaded" | null>(
    null,
  );

  const { withPhone, withoutPhone } = partitionByPhone(
    players,
    (player) => player.mobile,
  );

  const downloadContacts = async () => {
    const vcf = buildVCards(
      withPhone.map(({ player, phone }) => ({
        name: player.name,
        phone,
        organisation: groupName,
        note: player.position || undefined,
      })),
    );

    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    setDelivery(
      await shareOrDownloadFile(
        blob,
        `${slugify(groupName)}-contacts.vcf`,
        `${groupName} contacts`,
      ),
    );
  };

  const copyNumbers = async () => {
    const numbers = withPhone.map(({ phone }) => phone).join(", ");
    try {
      await navigator.clipboard.writeText(numbers);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. Show the list rather than leaving a button that
      // does nothing.
      window.prompt("Copy these numbers:", numbers);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <MessageCircle />
          <span>WhatsApp Group</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            WhatsApp group for {groupName}
          </DialogTitle>
          <DialogDescription className="text-muted">
            WhatsApp doesn't allow a group to be created from a link, so the
            group itself has to be made in the app. Import the squad as contacts
            first and they'll be there to pick from.
          </DialogDescription>
        </DialogHeader>

        <ol className="text-sm text-muted list-decimal pl-5 flex flex-col gap-1">
          <li>Get the contacts file onto your phone using the button below.</li>
          <li>
            Open it and choose{" "}
            <span className="text-white">Add All Contacts</span>. The preview
            only shows the first player — that's normal, all{" "}
            {withPhone.length} are in the file.
          </li>
          <li>
            In WhatsApp: <span className="text-white">New chat</span> →{" "}
            <span className="text-white">New group</span>, then pick the players
            by name.
          </li>
        </ol>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={downloadContacts}
            disabled={withPhone.length === 0}
          >
            <Download />
            <span>
              Download {withPhone.length} contact
              {withPhone.length === 1 ? "" : "s"} (.vcf)
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={copyNumbers}
            disabled={withPhone.length === 0}
          >
            {copied ? <Check /> : <Copy />}
            <span>{copied ? "Copied" : "Copy numbers"}</span>
          </Button>
        </div>

        {delivery === "downloaded" && (
          <p className="text-xs text-muted">
            On an iPhone, open the file from the Files app rather than the
            Safari download banner — Safari's preview only offers the first
            contact.
          </p>
        )}

        {withPhone.length === 0 && (
          <p className="text-sm text-destructive">
            No member of this group has a usable mobile number on file.
          </p>
        )}

        {withoutPhone.length > 0 && (
          <div className="bg-background border border-gray-600 rounded-md p-3">
            <p className="text-xs text-muted">
              <span className="text-white">
                {withoutPhone.length} player
                {withoutPhone.length === 1 ? "" : "s"}
              </span>{" "}
              have no usable mobile number and aren't included:{" "}
              {withoutPhone.map((p) => p.name).join(", ")}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
