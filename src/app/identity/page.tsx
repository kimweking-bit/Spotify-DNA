import type { Metadata } from "next";
import { IdentityDashboard } from "@/components/identity-dashboard";

export const metadata: Metadata = {
  title: "Your listening identity",
  description: "A private, on-device summary of your Spotify listening history.",
};

export default function IdentityPage() {
  return <IdentityDashboard />;
}
