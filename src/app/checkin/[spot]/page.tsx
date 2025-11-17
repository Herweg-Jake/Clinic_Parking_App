import { redirect } from "next/navigation";

export default function SpotCheckinPage({
  params,
}: {
  params: { spot: string };
}) {
  // Redirect to the main check-in page with the spot pre-filled
  redirect(`/checkin?spot=${params.spot}`);
}
