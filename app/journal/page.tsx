import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import JournalApp from "./JournalApp";

export default async function JournalPage() {
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  return <JournalApp />;
}
