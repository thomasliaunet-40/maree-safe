const DIRECTIONS_FR = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO',
];

export function degreesToCompass(degrees: number): string {
  const idx = Math.round((degrees % 360) / 22.5) % 16;
  return DIRECTIONS_FR[idx];
}

export function windArrow(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized < 22.5 || normalized >= 337.5) return '↓'; // vent du N → souffle vers le S
  if (normalized < 67.5) return '↙';
  if (normalized < 112.5) return '←';
  if (normalized < 157.5) return '↖';
  if (normalized < 202.5) return '↑';
  if (normalized < 247.5) return '↗';
  if (normalized < 292.5) return '→';
  return '↘';
}

export function beaufortScale(knots: number): { force: number; description: string } {
  if (knots < 1) return { force: 0, description: 'Calme' };
  if (knots < 4) return { force: 1, description: 'Très légère brise' };
  if (knots < 7) return { force: 2, description: 'Légère brise' };
  if (knots < 11) return { force: 3, description: 'Petite brise' };
  if (knots < 17) return { force: 4, description: 'Jolie brise' };
  if (knots < 22) return { force: 5, description: 'Bonne brise' };
  if (knots < 28) return { force: 6, description: 'Vent frais' };
  if (knots < 34) return { force: 7, description: 'Grand frais' };
  if (knots < 41) return { force: 8, description: 'Coup de vent' };
  if (knots < 48) return { force: 9, description: 'Fort coup de vent' };
  if (knots < 56) return { force: 10, description: 'Tempête' };
  if (knots < 64) return { force: 11, description: 'Violente tempête' };
  return { force: 12, description: 'Ouragan' };
}
