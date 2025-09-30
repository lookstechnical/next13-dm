import { Link } from "@remix-run/react";
import { SessionItem, User } from "~/types";
import { DeleteConfirm } from "../forms/delete-confirm";
import { ActionProtection } from "../action-protection";
import { AllowedRoles } from "../route-protections";
import { Button } from "../ui/button";
import { MoreActions } from "../layout/more-actions";

export const SessionItemCard = ({
  sessionItem,
  to,
  user,
}: {
  sessionItem: SessionItem;
  to: string;
  user: User;
}) => {
  const renderContent = () => {
    return (
      <>
        <div className="flex flex-col lg:flex-row gap-4 justify-between py-4">
          <div className="lg:w-1/4 flex flex-col">
            <div className="text-sm text-muted">Title</div>
            {sessionItem?.drills?.name}
          </div>
          <div className="lg:w-1/4 [&>p]:text-xs [&>p]:mb-4 flex flex-col">
            <div className="text-sm text-muted">Description</div>
            <div
              dangerouslySetInnerHTML={{
                __html: sessionItem?.drills?.description,
              }}
            />
          </div>
          <div className="lg:w-1/4 flex flex-col">
            <div className="text-sm text-muted">Intensity</div>
            {sessionItem?.drills?.intensity}
          </div>
          <div className="lg:w-1/6 flex flex-col">
            {" "}
            <div className="text-sm text-muted">Responsible</div>
            {sessionItem.assignedTo}
          </div>
          <div className="lg:w-1/6 flex flex-col">
            {" "}
            <div className="text-sm text-muted">Duration</div>
            {sessionItem.duration}
          </div>
        </div>
      </>
    );
  };

  if (sessionItem.type === "section") {
    return (
      <div className="flex flex-col lg:flex-row gap-4 justify-between py-4 text-foreground">
        <h3
          className="text-muted text-xl"
          dangerouslySetInnerHTML={{ __html: sessionItem.description }}
        />
        <div className="w-fit">
          <MoreActions>
            <DeleteConfirm
              name={sessionItem?.drills?.name}
              id={sessionItem.id}
              term="Remove"
            >
              <Button className="w-full">Delete</Button>
            </DeleteConfirm>
            <Button className="w-full" variant="outline">
              <Link
                to={`/dashboard/events/${sessionItem.eventId}/session-plan/edit/${sessionItem.id}`}
              >
                Edit
              </Link>
            </Button>
          </MoreActions>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row bg-wkbackground w-full text-foreground p-4">
      {to && (
        <Link to={to} className="w-full">
          {renderContent()}
        </Link>
      )}
      {!to && renderContent()}
      <ActionProtection allowedRoles={AllowedRoles.headOfDept} user={user}>
        <div className="w-fit">
          <MoreActions>
            <DeleteConfirm
              name={sessionItem?.drills?.name}
              id={sessionItem.id}
              term="Remove"
            >
              <Button className="w-full">Delete</Button>
            </DeleteConfirm>
            <Button className="w-full" variant="outline">
              <Link
                to={`/dashboard/events/${sessionItem.eventId}/session-plan/edit/${sessionItem.id}`}
              >
                Edit
              </Link>
            </Button>
          </MoreActions>
        </div>
      </ActionProtection>
    </div>
  );
};
