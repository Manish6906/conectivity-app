// sent = ✓ | delivered = ✓✓ grey | seen = ✓✓ blue
export default function Ticks({ status }) {
  const color = status === "seen" ? "#34b7f1" : "#8696a0";
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.5l3.5 3.5L11 2" />
      {status !== "sent" && <path d="M6 6.5l3.5 3.5L16 2" />}
    </svg>
  );
}