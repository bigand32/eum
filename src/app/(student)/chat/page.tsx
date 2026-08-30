import { redirect } from "next/navigation";

export default function ChatRedirect() {
  redirect("/feedback/order-demo-completed");
}
