import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_app_info",
  title: "Get app info",
  description:
    "Return metadata about the Pi Billboard app: purpose, main features, and top-level navigation routes.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const info = {
      name: "Pi Billboard",
      description:
        "Global AI ad platform for sports and live-venue billboards. Brands buy ad placements and settle payments in Pi cryptocurrency.",
      routes: [
        { path: "/", label: "Global Network" },
        { path: "/studio", label: "AI Creative" },
        { path: "/campaigns", label: "Campaigns" },
        { path: "/analytics", label: "Analytics" },
        { path: "/innovate", label: "Innovation Bot" },
      ],
      features: [
        "AI creative generation for billboard ads",
        "Venue targeting across live sports networks",
        "Pi cryptocurrency payments (Pi Network SDK)",
        "Campaign analytics and reporting",
      ],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
      structuredContent: info,
    };
  },
});
