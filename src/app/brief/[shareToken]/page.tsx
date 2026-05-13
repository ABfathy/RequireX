import { notFound } from "next/navigation";

import {
  loadPublicBriefView,
  PublicShareLinkNotFoundError,
} from "@/server/services/public-review";

import { PublicBriefView } from "./public-brief-view";

type PageProps = { params: Promise<{ shareToken: string }> };

export default async function BriefPage({ params }: PageProps) {
  const { shareToken } = await params;

  const data = await loadPublicBriefView(shareToken).catch((err: unknown) => {
    if (err instanceof PublicShareLinkNotFoundError) notFound();
    throw err;
  });

  return <PublicBriefView data={data} />;
}
