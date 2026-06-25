type Bar = {
  label: string;
  value: number;
  color: string;
};

export function AnalyticsBarChart({
  bars,
  maxHeight = 96,
  showLegend = false,
  legendFormatter,
  valueMode = "scaled",
}: {
  bars: Bar[];
  maxHeight?: number;
  showLegend?: boolean;
  legendFormatter?: (label: string, value: number) => string;
  valueMode?: "scaled" | "direct";
}) {
  const maxVal = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: `${maxHeight}px` }}>
        {bars.map((bar) => {
          const height =
            valueMode === "direct"
              ? Math.max(0, Math.min(maxHeight, bar.value))
              : Math.round((bar.value / maxVal) * maxHeight);

          return (
            <div
              key={bar.label}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: "3px" }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${height}px`,
                  background: bar.color,
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <span style={{ fontSize: "9px", color: "#aaa" }}>{bar.label}</span>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
          {bars.map((bar) => (
            <div
              key={bar.label}
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#888" }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: bar.color }} />
              {legendFormatter
                ? legendFormatter(bar.label, bar.value)
                : `${bar.label} — NPR ${bar.value.toLocaleString("en-NP")}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
