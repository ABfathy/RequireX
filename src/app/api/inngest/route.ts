import { serve } from "inngest/next";

import { inngest } from "@/server/inngest/client";
import { inngestFunctions } from "@/server/inngest/functions";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  streaming: true,
});
