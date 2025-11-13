import { readFile } from "fs/promises";
import { join } from "path";

export const loader = async () => {
  try {
    // Read the tracking script from the public directory
    const scriptPath = join(process.cwd(), "public", "capty-tracking.js");
    const scriptContent = await readFile(scriptPath, "utf-8");

    return new Response(scriptContent, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Error loading tracking script:", error);
    return new Response("// Tracking script not found", {
      status: 404,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
      },
    });
  }
};
