import { ResponsiveContainer } from "recharts";
import { Card } from "./Card.jsx";
import { SectionTitle, Empty } from "./SectionTitle.jsx";

/**
 * Card + title + a fixed-height ResponsiveContainer.
 * ResponsiveContainer needs a parent with a real height — the usual reason a
 * Recharts chart renders blank. This guarantees one.
 */
export function ChartFrame({ title, hint, height = 210, empty, children }) {
  return (
    <Card>
      <SectionTitle hint={hint}>{title}</SectionTitle>
      {empty ? (
        <Empty>{empty}</Empty>
      ) : (
        <div style={{ width: "100%", height }} data-noswipe="">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
