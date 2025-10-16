import type { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { EventCard } from "~/components/events/event-card";
import { AttributeHeatmap } from "~/components/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CardGrid } from "~/components/ui/card-grid";
import { DashboardService } from "~/services/dashboardService";
import { EventService } from "~/services/eventService";
import { ReportService } from "~/services/reportService";
import { withAuth } from "~/utils/auth-helpers";

export { ErrorBoundary } from "~/components/error-boundry";

export const meta: MetaFunction = () => {
  return [
    { title: "beCoachable" },
    { name: "description", content: "Welcome to beCoachable" },
  ];
};
type CoachQuote = {
  content: string;
  author: string;
  position: string;
};

const coachQuotes: CoachQuote[] = [
  {
    content:
      "A coach is someone who can give correction without causing resentment.",
    author: "John Wooden",
    position: "Basketball Coach",
  },
  {
    content: "The secret to winning is constant, consistent management.",
    author: "Tom Landry",
    position: "Football Coach",
  },
  {
    content:
      "A good coach will make his players see what they can be rather than what they are.",
    author: "Ara Parseghian",
    position: "Football Coach",
  },
  {
    content: "The best motivation always comes from within.",
    author: "Michael Jordan",
    position: "Athlete",
  },
  {
    content:
      "The difference between ordinary and extraordinary is that little extra.",
    author: "Jimmy Johnson",
    position: "Football Coach",
  },
  {
    content:
      "A coach is someone who tells you what you don’t want to hear so you can be who you’ve always known you could be.",
    author: "Tom Landry",
    position: "Football Coach",
  },
  {
    content: "It’s not whether you get knocked down, it’s whether you get up.",
    author: "Vince Lombardi",
    position: "Football Coach",
  },
  {
    content:
      "Don’t measure yourself by what you have accomplished, but by what you should have accomplished with your ability.",
    author: "John Wooden",
    position: "Basketball Coach",
  },
  {
    content:
      "The greatest compliment you can give a coach is to listen to them.",
    author: "Nick Saban",
    position: "Football Coach",
  },
  {
    content: "Winning takes talent, to repeat takes character.",
    author: "John Wooden",
    position: "Basketball Coach",
  },
];

export function getRandomCoachQuote(): CoachQuote {
  const index = Math.floor(Math.random() * coachQuotes.length);
  return coachQuotes[index];
}

export const loader = withAuth(async ({ user, supabaseClient }) => {
  const dashService = new DashboardService(supabaseClient);
  const eventService = new EventService(supabaseClient);
  const reportService = new ReportService(supabaseClient);

  const teamProgress = await reportService.getTeamProgressAvg(
    user.current_team as string
  );

  const event = await eventService.getNextEvent(user.current_team as string);
  const quote = getRandomCoachQuote();

  return { quote, event, teamProgress, user };
});

export default function Index() {
  const { quote, event, teamProgress } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto p-4">
      <CardGrid items={[{ test: "" }]} title="Dashboard">
        <AttributeHeatmap
          className="col-span-2 xl:col-span-1"
          attributes={teamProgress?.scores}
          onCellClick={() => {}}
        />

        <Card className="card-gradient-green text-white border-0 col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-muted">
              Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg mb-2">Next Event</h3>
            <EventCard
              event={event}
              to={(eventId) => `/dashboard/events/${eventId}`}
            />
            {/* <p className="text-xs opacity-90">+20.1% from last month</p> */}
          </CardContent>
        </Card>

        <Card className="card-gradient-green text-white border-0 col-span-2 md:col-span-3 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-muted">
              Players
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
            <div>
              <h3 className="text-lg">Top Performers</h3>
              {/* <ul className="py-4">
                <li>Jimmy Smith</li>
                <li>Peter Williams</li>
              </ul> */}
              <p className="text-sm">Awaiting data</p>
            </div>
            <div>
              <h3 className="text-lg">Worst Performers</h3>
              <p className="text-sm">Awaiting data</p>
              {/* <ul className="py-4">
                <li>Jimmy Smith</li>
                <li>Peter Williams</li>
              </ul> */}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient-green text-white border-0 col-span-2 md:col-span-3 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90 text-muted">
              Quote of the day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="text-xl italic text-foreground">
              <p>"{quote?.content}"</p>
            </blockquote>
            <figcaption className="flex items-end justify-center mt-2 space-x-3 rtl:space-x-reverse">
              <div className="flex items-center divide-x-2 rtl:divide-x-reverse divide-gray-500">
                <cite className="pe-3 font-medium">{quote?.author}</cite>
                <cite className="ps-3 text-sm">{quote.position}</cite>
              </div>
            </figcaption>
          </CardContent>
        </Card>
      </CardGrid>
    </div>
  );
}
