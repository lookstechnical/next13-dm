/**
 * Handing a generated file to the user, in a way mobile browsers cooperate
 * with.
 */

/**
 * Trigger a download of an in-memory blob.
 *
 * Two details matter on phones and neither does on desktop, which is why the
 * naive version appears to work right up until someone tries it:
 *
 *  - The anchor is put in the document before it's clicked. A detached anchor
 *    is ignored by some mobile browsers.
 *  - The object URL is revoked on a timer, not on the next line. Revoking
 *    immediately races the browser's own read of the blob; desktop Chrome
 *    starts the download synchronously and gets away with it, mobile Safari
 *    can end up with a truncated file — which for a multi-contact vCard looks
 *    exactly like "only the first contact came through".
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 10_000);
};

/**
 * Offer the file through the OS share sheet when the browser supports it,
 * falling back to a plain download.
 *
 * On iOS this is the difference between a file that imports and one that
 * doesn't: Safari renders a downloaded .vcf in its own preview, which shows a
 * single contact card, whereas the share sheet hands the file to Contacts (or
 * Files, or AirDrop) which reads every card in it.
 *
 * Returns how the file was delivered so the caller can tailor its instructions.
 */
export const shareOrDownloadFile = async (
  blob: Blob,
  filename: string,
  shareTitle: string,
): Promise<"shared" | "downloaded"> => {
  const file =
    typeof File !== "undefined"
      ? new File([blob], filename, { type: blob.type })
      : null;

  if (
    file &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: shareTitle });
      return "shared";
    } catch (error: any) {
      // The user dismissing the sheet is not a failure, and must not fall
      // through to a download they didn't ask for.
      if (error?.name === "AbortError") return "shared";
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
};
