export function getHeatmapColor(value: number) {
  // Clamp value between 0 and 10
  value = Math.round(Math.max(0, Math.min(10, value)));

  // Tailwind shades available
  const shades = [
    "bg-red-800",
    "bg-red-600",
    "bg-red-500",
    "bg-red-300",
    "bg-green-100",
    "bg-green-300",
    "bg-green-500",
    "bg-green-600",
    "bg-green-700",
    "bg-green-900",
  ];

  return shades[value - 1];
}
