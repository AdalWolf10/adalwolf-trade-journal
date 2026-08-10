import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import JournalApp from "../JournalApp";

export const metadata = {
  title: "Private Home",
};

export default async function JournalHomePage() {
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  return <JournalApp initialView="home" />;
}
