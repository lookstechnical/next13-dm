import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { PropsWithChildren } from "react";
import { AttributeForm } from "~/components/forms/form/attribute";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import ActionButton from "./ui/action-button";

type SheetPageProps = {
  backLink?: string;
  title: string;
  description: string;
  updateButton?: string;
  hasForm?: boolean;
};

export default function SheetPage({
  backLink,
  description,
  title,
  updateButton,
  children,
  hasForm,
}: PropsWithChildren<SheetPageProps>) {
  const navigate = useNavigate();

  const renderContent = () => {
    return (
      <>
        <div className="h-[80vh] px-10 py-4 overflow-scroll">{children}</div>
        <SheetFooter className="absolute bottom-0 w-full px-10 py-4 justify-end flex flex-row gap-2 bg-background">
          {backLink && (
            <Button asChild variant="link">
              <Link to={backLink}>Cancel</Link>
            </Button>
          )}
          {updateButton && <ActionButton title={updateButton} />}
        </SheetFooter>
      </>
    );
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && backLink) {
          navigate(backLink);
        }
      }}
    >
      <SheetContent className="w-full lg:w-2/3 sm:max-w-[100vw] p-0 m-0 bg-wkbackground">
        <SheetHeader className="bg-background w-full px-10 py-4 mb-2">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
        </SheetHeader>
        {hasForm && (
          <Form method="POST" encType="multipart/form-data">
            {renderContent()}
          </Form>
        )}
        {!hasForm && renderContent()}
      </SheetContent>
    </Sheet>
  );
}
