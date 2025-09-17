export const timeToColor = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const decimalHours = hours + minutes / 60;

  // Morning: 6-12 (yellows to oranges)
  if (decimalHours >= 6 && decimalHours < 12) {
    const hue = 30 + ((decimalHours - 6) / 6) * 30;
    return `hsl(${hue}, 70%, 60%)`;
  }
  // Afternoon: 12-18 (greens to blues)
  else if (decimalHours >= 12 && decimalHours < 18) {
    const hue = 120 + ((decimalHours - 12) / 6) * 60;
    return `hsl(${hue}, 70%, 60%)`;
  }
  // Evening: 18-24 (purples to reds)
  else if (decimalHours >= 18) {
    const hue = 270 + ((decimalHours - 18) / 6) * 90;
    return `hsl(${hue}, 70%, 60%)`;
  }
  // Night: 0-6 (dark blues)
  else {
    const hue = 240 + (decimalHours / 6) * 30;
    return `hsl(${hue}, 70%, 60%)`;
  }
};
