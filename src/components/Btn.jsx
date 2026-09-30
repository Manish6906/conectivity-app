const colors = {
  green: "bg-[#00a884] text-white hover:bg-[#019173]",
  gray: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  red: "bg-red-50 text-red-600 hover:bg-red-100",
};

export default function Btn({ color = "green", className = "", ...p }) {
  return (
    <button
      {...p}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 ${colors[color]} ${className}`}
    />
  );
}