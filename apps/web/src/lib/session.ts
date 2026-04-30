import { getSessionUser, requireSessionUser, SESSION_COOKIE } from "@toyverse/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return getSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requirePageSession() {
  const cookieStore = await cookies();
  try {
    return await requireSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
  } catch {
    redirect("/login");
  }
}
