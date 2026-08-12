import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import JournalApp from "../JournalApp";

export const metadata = {
  title: "Recently Deleted",
};

export default async function JournalTrashPage() {
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  return <JournalApp initialView="trash" />;
}
