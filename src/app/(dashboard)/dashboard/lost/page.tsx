import { redirect } from "next/navigation";

export default function LostItemsRedirect() {
  redirect("/dashboard/items?type=lost");
}
