export const appName = "SentinelAI";
export const appDescription =
  "AI risk monitoring for production LLMs. Catch hallucinations, prompt injections, and jailbreaks before they reach your users.";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// prefix for GitHub Pages project sites (empty locally, e.g. '/Sentinel-AI' in CI)
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// helper for raw assets/links that Next.js does not auto-prefix
export const assetPath = (path: string) => `${basePath}${path}`;

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: "Blacksujit",
  repo: "Sentinel-AI",
  branch: "main",
};
