import { PropsWithChildren } from "react";

/**
 * Full-page message for the public invitation routes. Used for the states a
 * parent can legitimately land on — an expired, already-completed or unknown
 * invitation link — so they get an explanation instead of being bounced to the
 * dashboard, which reads as a broken link.
 */
export default function InviteMessage({
  title = "Player Invitation",
  children,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
      <div className="w-full py-6 flex flex-col max-w-[50rem] items-center text-center px-4">
        <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

        <h1 className="text-4xl">{title}</h1>
        <p className="text-muted mt-2">{children}</p>
      </div>
    </div>
  );
}
