import { requireInternalAuth } from "@/server/auth";

export default async function InternalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInternalAuth();
  return <>{children}</>;
}
