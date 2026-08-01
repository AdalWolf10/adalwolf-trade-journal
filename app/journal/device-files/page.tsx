import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import DeviceFilesClient from "./DeviceFilesClient";

export const metadata = {
  title: "Device Files",
};

export default async function DeviceFilesPage() {
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  return <DeviceFilesClient />;
}
