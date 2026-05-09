import { Inngest } from "inngest";

import { serverEnv } from "@/lib/env/server";

export const inngest = new Inngest({
  id: "requirex",
  eventKey: serverEnv.INNGEST_EVENT_KEY,
});
