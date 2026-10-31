import { MapView } from "@/features/map/components/MapView";

import { trajectoryPoints, type CvPeriod } from "./parse";

// Where the person's documented periods took place, and the moves between them.
export function TrajectoryMap({ periods, name }: { periods: CvPeriod[]; name: string }) {
  const { places, moves } = trajectoryPoints(periods);
  if (places.length === 0) return null;
  return (
    <section aria-labelledby="trajectory-map-heading" className="mt-8">
      <h2 id="trajectory-map-heading" className="text-sm font-medium text-foreground">
        On the map
      </h2>
      <div className="mt-3">
        <MapView
          dots={places.map((p) => ({ id: p.id, href: `/institutions/${p.id}`, label: p.label, latitude: p.latitude, longitude: p.longitude, count: p.count }))}
          movements={moves}
          title={`Places in the trajectory of ${name}`}
        />
      </div>
    </section>
  );
}
