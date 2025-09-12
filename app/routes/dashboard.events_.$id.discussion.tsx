import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";
import { SendHorizonal, User } from "lucide-react";
import { CommentForm } from "~/components/forms/form/comment-form";
import { energy, reflectionQuestions } from "~/components/forms/form/reflect";
import ImageRating from "~/components/forms/image-rating";
import { Avatar } from "~/components/players/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import ActionButton from "~/components/ui/action-button";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EventService } from "~/services/eventService";
import { SessionService } from "~/services/sessionService";
import { withAuth, withAuthAction } from "~/utils/auth-helpers";

export const meta: MetaFunction = () => {
  return [{ title: "Players" }, { name: "description", content: "Player" }];
};

export const loader: LoaderFunction = withAuth(
  async ({ params, supabaseClient, user }) => {
    const eventService = new EventService(supabaseClient);
    const sessionService = new SessionService(supabaseClient);

    const event = await eventService.getEventById(params.id as string);
    const reflections = await sessionService.getReflectionsById(
      params.id as string,
      user
    );

    return { event, reflections };
  }
);

export const action: ActionFunction = withAuthAction(
  async ({ request, supabaseClient, user }) => {
    const sessionService = new SessionService(supabaseClient);

    const formData = await request.formData();
    const comment = formData.get("comment") as string;
    const parentId = formData.get("parentId") as string;

    await sessionService.addSessionReflectionComments(parentId, {
      comment,
      user_id: user.id,
    });

    return {};
  }
);

export default function EventDiscussion() {
  const { event, reflections } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="bg-card min-h-screen py-10">
        <div className="container mx-auto px-4">
          <div className="w-full flex flex-row justify-between gap-2">
            <div></div>
            <div className="flex flex-row">
              {/* <SessionDownloadButton sessionItems={sessionItems} /> */}
              <Button variant="outline" asChild className="text-white">
                <Link to={`/dashboard/events/${event.id}/discussion/reflect`}>
                  Add Reflection
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-2">
          <h2 className="text-muted text-lg mb-8">Reflections</h2>
          <div className="flex flex-col gap-8">
            {reflections?.map((r) => (
              <Card className="bg-wkbackground border-none">
                <CardContent>
                  <article className="flex flex-col lg:flex-row gap-8 p-6 border-b-2 mb-4 border-input">
                    <div className="flex flex-col gap-4 items-center justify-center lg:w-1/6">
                      {r.users.photoUrl ? (
                        <img
                          width={16}
                          height={16}
                          alt={r.users.name}
                          className="w-16 h-16 rounded-full object-cover mr-4"
                          src={r.users.photoUrl}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                          <User size={24} className="text-gray-400" />
                        </div>
                      )}
                      <p className="text-muted text-sm">{r.users?.name}</p>
                    </div>
                    <div className="flex flex-col gap-4 lg:w-3/6">
                      <div>
                        <h4 className="capitalize text-muted">
                          {reflectionQuestions[0]}
                        </h4>
                        <p className="text-foreground">{r.well}</p>
                      </div>
                      <div>
                        <h4 className="capitalize text-muted">
                          {reflectionQuestions[1]}
                        </h4>
                        <p className="text-foreground">{r.improve}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4  lg:w-2/6">
                      <div>
                        <h4 className="capitalize text-muted">
                          {reflectionQuestions[2]}
                        </h4>
                        <p className="text-foreground">
                          <ImageRating
                            name="engagement"
                            defaultValue={r.engagement}
                            disabled
                            size={10}
                          />
                        </p>
                      </div>
                      <div>
                        <h4 className="capitalize text-muted">
                          {reflectionQuestions[3]}
                        </h4>
                        <p className="text-foreground">
                          <ImageRating
                            name="energy"
                            items={energy}
                            defaultValue={r.coachEnergy}
                            disabled
                            size={10}
                          />
                        </p>
                      </div>
                    </div>
                  </article>
                  <div>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>
                          <h3 className="text-muted capitalize mb-2">
                            Comments{" "}
                            {r.comments.length > 0
                              ? `(${r.comments.length})`
                              : `(0)`}
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col gap-4 py-6">
                            {r.comments.map((c) => (
                              <div className="flex gap-3">
                                <Avatar
                                  photoUrl={c.users.photoUrl}
                                  name={c.users.name}
                                  size={10}
                                  containerSize="w-8 h-8"
                                />

                                <div className="flex-1 min-w-0">
                                  {/* Bubble */}
                                  <div className="inline-block rounded-2xl bg-gray-100 dark:bg-gray-800 px-3 py-2 max-w-full">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="font-semibold text-gray-900 dark:text-gray-100 leading-5">
                                        {c.users?.name}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(
                                          c.createdAt
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-gray-900 dark:text-gray-100 leading-6 whitespace-pre-wrap">
                                      {c.comment}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Form
                            method="POST"
                            className="flex flex-row w-full items-end"
                          >
                            <CommentForm parentId={r.id} />
                            <ActionButton
                              variant="outline"
                              title={<SendHorizonal />}
                            />
                          </Form>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <Outlet />
      </div>
    </>
  );
}
