import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user data from your backend (replace with actual logic)
  const user = await fetchUserProfile(userId);

  return NextResponse.json({ user });
}

// Mock function (replace with actual backend calls)
async function fetchUserProfile(userId: string) {
  return { id: userId, username: "johndoe", email: "johndoe@example.com" };
}