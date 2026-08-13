import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// statically cached — pre-rendered into the static export
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
