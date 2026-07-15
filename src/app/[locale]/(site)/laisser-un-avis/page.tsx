import { redirect } from "next/navigation";

export default function LaisserUnAvisPage() {
  redirect("/?openReview=1");
}
