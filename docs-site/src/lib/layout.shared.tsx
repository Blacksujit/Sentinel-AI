import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { assetPath, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img
            src={assetPath("/logo.svg")}
            alt="SentinelAI"
            className="h-5 w-auto text-fd-foreground"
          />
        </>
      ),
    },
    links: [
      { text: "Docs", url: "/docs" },
      { text: "Live Demo", url: "https://sentinelaihq.com" },
      { text: "API", url: "/docs/api" },
      { text: "SDK", url: "/docs/sdk" },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
