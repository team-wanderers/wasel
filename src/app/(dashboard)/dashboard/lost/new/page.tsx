import { redirect } from "next/navigation";

export default function NewLostItemRedirect() {
  redirect("/dashboard/report?type=lost");
}
