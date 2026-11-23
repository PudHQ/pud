export function drawDisk(ink: CanvasRenderingContext2D) {
  ink.fillStyle = "#777975";
  ink.fillRect(0, 0, 320, 168);
  ink.fillStyle = "#272a29";
  ink.fillRect(0, 0, 320, 18);
  ink.fillRect(0, 150, 320, 18);
  ink.font = "italic 900 70px Arial, sans-serif";
  ink.fillText("PudDex", 22, 105, 276);
}

export function drawBadge(ink: CanvasRenderingContext2D) {
  ink.fillStyle = "#292b2b";
  ink.fillRect(0, 0, 384, 104);
  ink.fillStyle = "#a5a9a6";
  ink.font = "bold 43px monospace";
  ink.fillText("PUD SYSTEMS", 24, 66, 334);
}

export function drawCaseBadge(ink: CanvasRenderingContext2D) {
  const plate = ink.createLinearGradient(0, 0, 390, 144);
  plate.addColorStop(0, "#594c41");
  plate.addColorStop(0.48, "#302f2d");
  plate.addColorStop(1, "#424341");
  ink.fillStyle = plate;
  ink.fillRect(0, 0, 420, 144);
  ink.fillStyle = "#ad6f53";
  for (let stripe = 0; stripe < 6; stripe++) ink.fillRect(22, 27 + stripe * 10, 54, 5);
  ink.fillStyle = "#c4baab";
  ink.font = "bold 39px sans-serif";
  ink.fillText("PUD SYSTEMS", 91, 67, 300);
  ink.font = "18px monospace";
  ink.letterSpacing = "2px";
  ink.fillText("PERSONAL COMPUTER", 92, 102);
}
