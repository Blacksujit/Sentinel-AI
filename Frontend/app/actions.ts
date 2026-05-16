"use server";

import { auth } from "@clerk/nextjs/server";

export async function signOut() {
  const { redirectToSignIn } = await auth();
  redirectToSignIn({ returnBackUrl: "/" });
}
