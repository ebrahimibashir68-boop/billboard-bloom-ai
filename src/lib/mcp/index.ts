import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import getAppInfoTool from "./tools/get-app-info";

// Issuer must be the direct Supabase host (the published proxy URL fails RFC 8414
// issuer matching). VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "pi-billboard-mcp",
  title: "Pi Billboard MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Pi Billboard app — a global AI ad platform for sports and live-venue billboards that settles payments in Pi. Use `get_app_info` to learn the app's routes and features. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, getAppInfoTool],
});
