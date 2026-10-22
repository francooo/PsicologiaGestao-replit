// Hex values of the cp-* tokens (tailwind.config.ts) for libraries that need raw colors, like Recharts.
export const chartColors = {
  income: "#3E8E63", // cp-success
  expense: "#C2413A", // cp-danger
  balance: "#287EA5", // cp-action
  grid: "#EEEAE4", // cp-divider
  axis: "#8A929C", // cp-subtle
};

/** Category sequence for pies/legends: brand tones first, then deeper variants so neighbours stay distinct. */
export const categoryPalette = [
  "#287EA5", // action
  "#8BA798", // sage
  "#5B5486", // lavender ink
  "#C9A77C", // sand (deeper)
  "#3E8E63", // success
  "#B7791F", // warning
  "#4F6B5C", // sage ink
  "#9C95C9", // lavender (deeper)
  "#21698A", // action hover
  "#8A6A45", // sand ink
  "#C2413A", // danger
];

export function categoryColor(index: number) {
  return categoryPalette[index % categoryPalette.length];
}
