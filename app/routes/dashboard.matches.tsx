import type { MetaFunction } from "@remix-run/node";
import { User } from "lucide-react";

export const meta: MetaFunction = () => {
  return [{ title: "Matches" }, { name: "description", content: "Player" }];
};

export default function Matches() {
  return (
    <>
      <User />
    </>
  );
}
