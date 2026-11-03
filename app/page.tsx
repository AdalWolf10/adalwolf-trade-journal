import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function Home() {
  if (await isAuthenticated()) {
    redirect("/journal/home");
  }

  return <LoginForm />;
}
