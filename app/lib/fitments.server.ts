export const FITMENTS = [
  {
    yearStart: 1989,
    yearEnd: 2000,
    make: "Lexus",
    model: "LS400",
    drivetrain: "RWD",
    frontSku: "76016",
    rearSku: "76516"
  },
  {
    yearStart: 2015,
    yearEnd: 2021,
    make: "Subaru",
    model: "STI",
    drivetrain: "AWD",
    frontSku: "76001",
    rearSku: "76501"
  },
  {
    yearStart: 2015,
    yearEnd: 2021,
    make: "Subaru",
    model: "WRX",
    drivetrain: "AWD",
    frontSku: "76001",
    rearSku: "76501"
  }
];

export function findFitment(year: number, make: string, model: string, drivetrain: string) {
  return FITMENTS.find(f =>
    year >= f.yearStart &&
    year <= f.yearEnd &&
    f.make === make &&
    f.model === model &&
    f.drivetrain === drivetrain
  );
}