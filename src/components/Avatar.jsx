export default function Avatar({ src, name = "?", size = 48, online = false }) {
  const url =
    src ||
    `https://ui-avatars.com/api/?background=random&color=fff&bold=true&name=${encodeURIComponent(name)}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <img src={url} alt={name} className="w-full h-full rounded-full object-cover" />
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
}