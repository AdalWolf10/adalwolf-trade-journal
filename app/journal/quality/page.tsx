import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import QualityPageClient from "./QualityPageClient";

export const metadata = {
  title: "Trade Quality",
};

export default async function QualityPage() {
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  return <QualityPageClient />;
}
