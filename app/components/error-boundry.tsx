import { useRouteError } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();
  if (error?.status) {
    return (
      <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
        <div className="w-full py-6 flex flex-col w-[50rem] items-center">
          <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

          <h1 className="text-xl">
            You do not have permissions to access this page please contact your
            admin
          </h1>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen min-w-screen bg-background text-foreground flex justify-center items-center">
      <div className="w-full py-6 flex flex-col w-[50rem] items-center">
        <img src="/logo.png" className="w-20 mb-2" width={50} height={50} />

        <h1 className="text-4xl">There Was an error please try again </h1>
        <p className="text-muted">
          if the problem persists and your on mobile please try on a laptop or
          desktop pc
        </p>
      </div>
    </div>
  );
}
