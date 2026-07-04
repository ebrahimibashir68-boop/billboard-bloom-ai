import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import getAppInfoTool from "./tools/get-app-info";

export default defineMcp({
  name: "pi-billboard-mcp",
  title: "Pi Billboard MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Pi Billboard app — a global AI ad platform for sports and live-venue billboards that settles payments in Pi. Use `get_app_info` to learn the app's routes and features. Use `echo` to verify connectivity.",
  tools: [echoTool, getAppInfoTool],
});
