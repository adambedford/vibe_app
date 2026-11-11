import type { CatalogEntry } from "@vibe/host";
import type { Manifest } from "@vibe/protocol";

interface RawItem {
  gameId: string;
  versionId: string;
  manifest: Manifest;
  poster?: string;
}

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const [config, items] = await Promise.all([
    fetch("/config.json").then((r) => r.json() as Promise<{ gameUrlTemplate: string }>),
    fetch("/catalog.json").then((r) => r.json() as Promise<RawItem[]>),
  ]);
  return items.map((i) => ({
    gameId: i.gameId,
    versionId: i.versionId,
    manifest: i.manifest,
    url: config.gameUrlTemplate.replace("{game}", i.gameId).replace("{version}", i.versionId),
    poster: i.poster,
  }));
}
