import LandingPage from "@/components/landing/landing-page";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/feed");
  }

  return <LandingPage isSignedIn={false} />;
}
