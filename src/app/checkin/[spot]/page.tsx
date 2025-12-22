import { redirect } from "next/navigation";

export default function SpotCheckinPage({
  params,
}: {
  params: { spot: string };
}) {
  // Redirect to home page - QR codes no longer pre-fill spot
  // Users will navigate to check-in from the home page
  redirect("/");
}
