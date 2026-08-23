import { HeartPulse } from "lucide-react";
import { Card } from "../ui/card";
import { Player } from "~/types";
import { formatHeight } from "~/utils/height";

/**
 * Profile details that aren't in the page header — including the extras a
 * programme can ask for at registration.
 *
 * Medical conditions get their own card rather than a row in the list: it's the
 * one entry here a coach may need to find in a hurry, and burying it between
 * "School" and "Mother's height" would make it easy to miss.
 */
type PlayerDetails = {
  player: Player;
};

const Row: React.FC<{ label: string; value?: string | null }> = ({
  label,
  value,
}) => (
  <div className="flex flex-row justify-between gap-4 py-3 border-b border-border last:border-b-0">
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm text-white text-right">
      {value || <span className="text-muted">Not provided</span>}
    </span>
  </div>
);

export const PlayerDetails: React.FC<PlayerDetails> = ({ player }) => {
  const motherHeight = formatHeight(player.motherHeightInches);
  const fatherHeight = formatHeight(player.fatherHeightInches);

  return (
    <div className="flex flex-col gap-4">
      {player.medicalConditions && (
        <Card className="border-destructive/40 bg-destructive/5 p-6">
          <h3 className="text-sm font-semibold text-white flex flex-row gap-2 items-center mb-2">
            <HeartPulse className="w-4" /> Medical Conditions
          </h3>
          <p className="text-sm whitespace-pre-wrap">
            {player.medicalConditions}
          </p>
        </Card>
      )}

      <Card className="border-border p-6">
        <div className="flex flex-col">
          <Row label="Email" value={player.email} />
          <Row label="Mobile" value={player.mobile} />
          <Row label="Club" value={player.club} />
          <Row label="School" value={player.school} />
          <Row label="Mother's Height" value={motherHeight} />
          <Row label="Father's Height" value={fatherHeight} />
        </div>
      </Card>
    </div>
  );
};
