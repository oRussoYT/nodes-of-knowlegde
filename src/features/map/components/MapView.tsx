import { arcPath, project, radius, viewBoxFor, type MapItem, type Movement } from "../parse";

// A server-drawn SVG map on the Natural Earth basemap (/maps/world.svg).
// Dots are counts of records -- the bigger, the more people the record
// places there. Each dot links to its page; every count is also in the list
// beside the map (the map is never the only way to read it).

export interface Dot {
  id: string;
  href: string;
  label: string;
  latitude: number;
  longitude: number;
  count: number;
}

export function MapView({
  dots,
  items = [],
  movements = [],
  title,
}: {
  dots: Dot[];
  items?: MapItem[];
  movements?: Movement[];
  title: string;
}) {
  const points: [number, number][] = [
    ...dots.map((d) => [d.longitude, d.latitude] as [number, number]),
    ...items.map((i) => [i.longitude, i.latitude] as [number, number]),
    ...movements.flatMap((m) => [m.from, m.to]),
  ];
  const vb = viewBoxFor(points);
  const maxPeople = Math.max(1, ...movements.map((m) => m.people));
  return (
    <figure className="overflow-hidden rounded-md border border-border-default bg-surface-sunken">
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-label={title} className="block h-auto w-full">
        <image href="/maps/world.svg" x={0} y={0} width={360} height={180} preserveAspectRatio="none" className="opacity-90 dark:opacity-40" />
        {movements.map((m) => (
          <path
            key={`${m.fromId}-${m.toId}`}
            d={arcPath(m.from, m.to)}
            fill="none"
            className="stroke-accent"
            strokeOpacity={0.75}
            strokeWidth={(vb.w / 400) * (1 + (3 * m.people) / maxPeople)}
          >
            <title>{`${m.fromName} → ${m.toName}: ${m.people} ${m.people === 1 ? "person" : "people"}`}</title>
          </path>
        ))}
        {dots.map((d) => {
          const [x, y] = project(d.longitude, d.latitude);
          return (
            <a key={d.id} href={d.href}>
              <circle cx={x} cy={y} r={radius(d.count, vb.w)} className={d.count > 0 ? "fill-accent" : "fill-muted-foreground"} fillOpacity={d.count > 0 ? 0.8 : 0.45} stroke="white" strokeWidth={vb.w / 900}>
                <title>{`${d.label}: ${d.count}`}</title>
              </circle>
            </a>
          );
        })}
        {items.map((i) => {
          const [x, y] = project(i.longitude, i.latitude);
          const s = vb.w / 140;
          return (
            <a key={i.id} href={`/history/${i.id}`}>
              <rect x={x - s / 2} y={y - s / 2} width={s} height={s} transform={`rotate(45 ${x} ${y})`} className="fill-foreground" fillOpacity={0.7}>
                <title>{i.title}</title>
              </rect>
            </a>
          );
        })}
      </svg>
      <figcaption className="px-3 py-2 text-xs text-muted-foreground">
        Basemap: Natural Earth (public domain). Circles: institutions, sized by people in the record. Diamonds: history items.
      </figcaption>
    </figure>
  );
}
