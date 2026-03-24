import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const roster = [
  { name: "Rex Vandal", style: "Brawler", power: 9, speed: 5, charisma: 7, stamina: 8, hp: 42, finisher: "Concrete Sleep" },
  { name: "Neon Saint", style: "High Flyer", power: 5, speed: 10, charisma: 9, stamina: 7, hp: 34, finisher: "Halo Crash" },
  { name: "Grim Static", style: "Technician", power: 6, speed: 7, charisma: 6, stamina: 9, hp: 36, finisher: "Dead Channel" },
  { name: "Brick Mercy", style: "Brawler", power: 10, speed: 4, charisma: 6, stamina: 8, hp: 44, finisher: "Mercy Kill" },
  { name: "Velvet Viper", style: "Striker", power: 7, speed: 9, charisma: 8, stamina: 6, hp: 35, finisher: "Silk Fang" },
  { name: "Mondo Kane", style: "Powerhouse", power: 10, speed: 3, charisma: 7, stamina: 9, hp: 46, finisher: "Kane Drop" },
  { name: "Johnny Dialtone", style: "Showman", power: 6, speed: 6, charisma: 10, stamina: 7, hp: 35, finisher: "Busy Signal" },
  { name: "Sable Riot", style: "High Flyer", power: 5, speed: 9, charisma: 8, stamina: 8, hp: 33, finisher: "Riot Dive" },
  { name: "Wreckroom Walt", style: "Brawler", power: 8, speed: 5, charisma: 7, stamina: 8, hp: 40, finisher: "Basement Breaker" },
  { name: "Pastor Hex", style: "Technician", power: 6, speed: 6, charisma: 9, stamina: 8, hp: 36, finisher: "Last Sermon" },
  { name: "Turbo Hollis", style: "High Flyer", power: 4, speed: 10, charisma: 7, stamina: 8, hp: 32, finisher: "Overdrive" },
  { name: "Duke Dominion", style: "Powerhouse", power: 9, speed: 4, charisma: 8, stamina: 9, hp: 43, finisher: "Crown Breaker" },
  { name: "Harlan Voss", style: "Technician", power: 7, speed: 6, charisma: 6, stamina: 9, hp: 38, finisher: "Voss Lock" },
  { name: "Miss Mayhem", style: "Striker", power: 7, speed: 8, charisma: 9, stamina: 6, hp: 35, finisher: "Mayhem Maker" },
  { name: "Ox Gallagher", style: "Brawler", power: 9, speed: 4, charisma: 7, stamina: 9, hp: 43, finisher: "Stampede Slam" },
  { name: "Candy Cobra", style: "Showman", power: 5, speed: 8, charisma: 10, stamina: 6, hp: 33, finisher: "Sweet Venom" },
  { name: "Bishop Blackout", style: "Technician", power: 6, speed: 7, charisma: 8, stamina: 8, hp: 36, finisher: "Night Mass" },
  { name: "Crash Meridian", style: "High Flyer", power: 5, speed: 9, charisma: 7, stamina: 8, hp: 33, finisher: "Sky Burn" },
  { name: "Tank Talamo", style: "Powerhouse", power: 10, speed: 3, charisma: 6, stamina: 9, hp: 46, finisher: "Tread Mark" },
  { name: "Lola Voltage", style: "Striker", power: 6, speed: 9, charisma: 8, stamina: 7, hp: 34, finisher: "Static Kiss" }
];

async function getDb() {
  return open({
    filename: path.join(process.cwd(), "bbsbub.db"),
    driver: sqlite3.Database,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();

    let inserted = 0;
    let skipped = 0;

    for (const wrestler of roster) {
      const existing = await db.get(
        "SELECT id FROM wrestlers WHERE name = ?",
        wrestler.name
      );

      if (existing) {
        skipped++;
        continue;
      }

      await db.run(
        `
        INSERT INTO wrestlers
        (name, style, power, speed, charisma, stamina, hp, finisher, created_by, is_ai)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          wrestler.name,
          wrestler.style,
          wrestler.power,
          wrestler.speed,
          wrestler.charisma,
          wrestler.stamina,
          wrestler.hp,
          wrestler.finisher,
          "system",
          1
        ]
      );

      inserted++;
    }

    const allWrestlers = await db.all(
      "SELECT * FROM wrestlers ORDER BY id DESC"
    );

    return res.status(200).json({
      success: true,
      inserted,
      skipped,
      totalWrestlers: allWrestlers.length,
      wrestlers: allWrestlers,
    });
  } catch (error) {
    console.error("seed-roster error:", error);
    return res.status(500).json({
      error: "Failed to seed roster",
      details: error.message,
    });
  }
}