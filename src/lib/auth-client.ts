import type { auth } from "@/lib/auth";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), inferAdditionalFields<typeof auth>()],
});
