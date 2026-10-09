// Keep historical category colors readable within the neutral interface.
export function neutralColor(color = "#666666") {
  if (!/^#[\da-f]{6}$/i.test(color)) return "#666666";
  const channels = [1, 3, 5].map((offset) =>
    parseInt(color.slice(offset, offset + 2), 16),
  );
  const gray = Math.round(
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722,
  );
  return `#${gray.toString(16).padStart(2, "0").repeat(3)}`;
}
