export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const sameDay = (a, b) => a.toDateString() === b.toDateString();

export const dayLabel = (d) => {
  const x = new Date(d);
  const t = new Date();
  const y = new Date();
  y.setDate(t.getDate() - 1);
  if (sameDay(x, t)) return "Today";
  if (sameDay(x, y)) return "Yesterday";
  return x.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

export const fmtListTime = (d) => {
  const l = dayLabel(d);
  if (l === "Today") return fmtTime(d);
  if (l === "Yesterday") return l;
  return new Date(d).toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export const lastSeenText = (d) => {
  if (!d) return "";
  const l = dayLabel(d);
  const when = l === "Today" || l === "Yesterday" ? l.toLowerCase() : "on " + l;
  return `last seen ${when} at ${fmtTime(d)}`;
};