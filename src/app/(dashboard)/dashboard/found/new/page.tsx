import { redirect } from "next/navigation";

export default function NewFoundItemRedirect() {
  redirect("/dashboard/report?type=found");
}
