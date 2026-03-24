const firstNames = [
  "Rex",
  "Neon",
  "Grim",
  "Brick",
  "Velvet",
  "Mondo",
  "Johnny",
  "Sable",
  "Turbo",
  "Crash",
  "Tank",
  "Candy",
  "Bishop",
  "Lola",
  "Duke",
  "Ox",
  "Harlan",
  "Static",
  "Vinnie",
  "Blaze",
  "Riot",
  "Saint",
  "Gunner",
  "Phantom",
  "Ace",
  "Viper",
  "Lucky",
  "Mason",
  "Dagger",
  "Nova"
];

const lastNames = [
  "Vandal",
  "Saint",
  "Static",
  "Mercy",
  "Viper",
  "Kane",
  "Dialtone",
  "Riot",
  "Walt",
  "Hex",
  "Hollis",
  "Dominion",
  "Voss",
  "Mayhem",
  "Gallagher",
  "Cobra",
  "Blackout",
  "Meridian",
  "Talamo",
  "Voltage",
  "Crusher",
  "Inferno",
  "Graves",
  "Steel",
  "Rapture",
  "Doom",
  "Venom",
  "Drake",
  "Sledge",
  "Revolver"
];

const styles = [
  "Brawler",
  "High Flyer",
  "Technician",
  "Powerhouse",
  "Striker",
  "Showman"
];

const finishers = [
  "Concrete Sleep",
  "Halo Crash",
  "Dead Channel",
  "Mercy Kill",
  "Silk Fang",
  "Kane Drop",
  "Busy Signal",
  "Riot Dive",
  "Basement Breaker",
  "Last Sermon",
  "Overdrive",
  "Crown Breaker",
  "Voss Lock",
  "Mayhem Maker",
  "Stampede Slam",
  "Sweet Venom",
  "Night Mass",
  "Sky Burn",
  "Tread Mark",
  "Static Kiss",
  "Grave Digger",
  "Glass Jawbreaker",
  "Final Broadcast",
  "Iron Sermon",
  "The Black Parade"
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildStats(style) {
  let power = 5;
  let speed = 5;
  let charisma = 5;
  let stamina = 5;

  if (style === "Brawler") {
    power = rand(8, 10);
    speed = rand(4, 6);
    charisma = rand(5, 8);
    stamina = rand(7, 9);
  } else if (style === "High Flyer") {
    power = rand(4, 6);
    speed = rand(8, 10);
    charisma = rand(6, 9);
    stamina = rand(6, 8);
  } else if (style === "Technician") {
    power = rand(5, 7);
    speed = rand(6, 8);
    charisma = rand(5, 7);
    stamina = rand(8, 10);
  } else if (style === "Powerhouse") {
    power = rand(9, 10);
    speed = rand(3, 5);
    charisma = rand(5, 8);
    stamina = rand(8, 10);
  } else if (style === "Striker") {
    power = rand(6, 8);
    speed = rand(7, 9);
    charisma = rand(6, 8);
    stamina = rand(6, 8);
  } else if (style === "Showman") {
    power = rand(4, 7);
    speed = rand(5, 7);
    charisma = rand(9, 10);
    stamina = rand(6, 8);
  }

  const hp = 25 + power + stamina;

  return { power, speed, charisma, stamina, hp };
}

export function generateRandomWrestler() {
  const style = pick(styles);
  const stats = buildStats(style);

  return {
    name: `${pick(firstNames)} ${pick(lastNames)}`,
    style,
    ...stats,
    finisher: pick(finishers),
    created_by: "system",
    is_ai: 1,
  };
}