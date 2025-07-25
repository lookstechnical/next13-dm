import { LoaderFunction } from "react-router";
import { invitationService } from "../services/invitationService";

export const invitationByTokenLoader: LoaderFunction = async ({ params }) => {
  const token = params.token;

  const invitation = await invitationService.getInvitationByToken(token);

  return { invitation };
};
