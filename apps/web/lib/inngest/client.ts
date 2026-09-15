import "server-only";
import { createInngestClient } from "@snappit/inngest";
export const inngest = createInngestClient({ appId: "snappit-web" });
