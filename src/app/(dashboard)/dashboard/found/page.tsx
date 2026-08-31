import { redirect } from "next/navigation";

export default function FoundItemsRedirect() {
  redirect("/dashboard/items?type=found");
}
