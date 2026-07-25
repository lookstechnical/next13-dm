import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Player } from "~/types";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { calculateAgeGroup } from "~/utils/helpers";

type AddPlayerDialogProps = {
  programmeId: string;
  /** Team players who are not already registered for this programme. */
  availablePlayers: Player[];
};

// Lets staff add an existing player (already in the system, not yet on this
// programme) and register them in one click. Registration defaults their
// availability to "available" for every event, matching the self-registration
// default; staff can adjust availability/attendance afterwards in the grid.
export const AddPlayerDialog: React.FC<AddPlayerDialogProps> = ({
  programmeId,
  availablePlayers,
}) => {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const submitting = fetcher.state !== "idle";
  const pendingId = submitting
    ? (fetcher.formData?.get("playerId") as string)
    : undefined;

  // Close the dialog once a registration succeeds.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  const registerPlayer = (playerId: string) => {
    fetcher.submit(
      { intent: "registerExistingPlayer", programmeId, playerId },
      { method: "post" },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-1" />
          Add player
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-white">Add a player</DialogTitle>
          <DialogDescription className="text-muted">
            Search for a player already in the system and register them for this
            programme.
          </DialogDescription>
        </DialogHeader>

        {availablePlayers.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            Every player in this team is already registered.
          </p>
        ) : (
          <Command className="bg-transparent">
            <CommandInput
              placeholder="Search players by name..."
              className="text-white"
            />
            <CommandList>
              <CommandEmpty>No matching players.</CommandEmpty>
              <CommandGroup>
                {availablePlayers.map((player) => {
                  const ageGroup = player.dateOfBirth
                    ? calculateAgeGroup(player.dateOfBirth)
                    : null;
                  const isPending = pendingId === player.id;
                  return (
                    <CommandItem
                      key={player.id}
                      value={`${player.name} ${player.email ?? ""}`}
                      onSelect={() => !submitting && registerPlayer(player.id)}
                      className="flex items-center gap-3 text-white aria-selected:bg-primary/10 cursor-pointer"
                    >
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted/20 shrink-0" />
                      )}
                      <div className="flex-grow min-w-0">
                        <p className="text-sm truncate">{player.name}</p>
                        <p className="text-xs text-muted truncate">
                          {[player.position, ageGroup]
                            .filter(Boolean)
                            .join(" · ") || player.email}
                        </p>
                      </div>
                      {isPending && (
                        <span className="text-xs text-muted shrink-0">
                          Adding…
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
};
