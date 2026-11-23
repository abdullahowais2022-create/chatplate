import type { LatLng, ZoneSnap } from "./types";

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export type ZoneMatch =
  | { status: "inside"; zone: ZoneSnap; distanceKm: number | null }
  | { status: "outside"; distanceKm: number | null }
  | { status: "unknown" }
  | { status: "no_zones" };

/**
 * Finds the cheapest active delivery zone containing the customer.
 * A location pin is checked against RADIUS zones; address text is matched against AREA names.
 */
export function matchZone(zones: ZoneSnap[], restaurant: LatLng | null, input: { location?: LatLng | null; address?: string | null }): ZoneMatch {
  if (zones.length === 0) return { status: "no_zones" };
  const hits: { zone: ZoneSnap; distanceKm: number | null }[] = [];
  let distanceKm: number | null = null;

  if (input.location && restaurant) {
    distanceKm = Math.round(haversineKm(restaurant, input.location) * 10) / 10;
    for (const z of zones) if (z.type === "RADIUS" && z.radiusKm != null && distanceKm <= z.radiusKm) hits.push({ zone: z, distanceKm });
  }
  if (input.address) {
    const a = norm(input.address);
    for (const z of zones) {
      if (z.type !== "AREA") continue;
      if (z.areas.some((area) => area.trim() && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(norm(area))}($|[^\\p{L}\\p{N}])`, "u").test(a))) {
        hits.push({ zone: z, distanceKm });
      }
    }
  }
  if (hits.length) {
    hits.sort((x, y) => x.zone.fee - y.zone.fee);
    return { status: "inside", ...hits[0]! };
  }
  // We had a pin and radius zones exist: it's definitively outside.
  if (input.location && restaurant && zones.some((z) => z.type === "RADIUS")) {
    // …unless an AREA zone could still match an address we don't have yet.
    return { status: "outside", distanceKm };
  }
  if (input.address && !zones.some((z) => z.type === "RADIUS")) return { status: "outside", distanceKm: null };
  return { status: "unknown" };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
