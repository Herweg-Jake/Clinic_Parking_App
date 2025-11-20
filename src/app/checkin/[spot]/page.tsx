import { redirect } from "next/navigation";

export default function SpotCheckinPage({
  params,
}: {
  params: { spot: string };
}) {
  // Redirect to the home page (QR codes no longer pre-fill spot)
  redirect("/");
}
