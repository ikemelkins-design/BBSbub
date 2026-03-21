function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStyleBonus(style) {
  switch (style) {
    case "Brawler":
      return { power: 2, speed: 0, charisma: 0, stamina: 1 };
    case "Technician":
      return { power: 1, speed: 1, charisma: 0, stamina: 1 };
    case "High Flyer":
      return { power: 0, speed: 2, charisma: 1, stamina: 0 };
    case "Monster":
      return { power: 3, speed: -1, charisma: 0, stamina: 2 };
    case "Heel":
      return { power: 1, speed: 1, charisma: 2, stamina: 0 };
    default:
      return { power: 0, speed: 0, charisma: 0, stamina: 0 };
  }
}

function normalMoveText(attacker, defender) {
  const moves = [
    `${attacker.name} lands a stiff forearm on ${defender.name}.`,
    `${attacker.name} hits a running clothesline.`,
    `${attacker.name} drives ${defender.name} into the mat.`,
    `${attacker.name} throws a cheap shot while the ref is distracted.`,
    `${attacker.name} batters ${defender.name} with a brutal body slam.`,
    `${attacker.name} connects with a sharp elbow strike.`,
    `${attacker.name} whips ${defender.name} into the ropes and attacks on the rebound.`,
    `${attacker.name} stuns ${defender.name} with a knee to the midsection.`,
    `${attacker.name} drops ${defender.name} with a snap suplex.`,
    `${attacker.name} smashes ${defender.name} with a spinning lariat.`
  ];
  return pick(moves);
}

function crowdText(wrestler) {
  const lines = [
    `The crowd starts chanting for ${wrestler.name}.`,
    `${wrestler.name} plays to the crowd and feeds off the noise.`,
    `Boos and cheers rain down as ${wrestler.name} circles the ring.`,
    `${wrestler.name} points to the cheap seats and soaks in the reaction.`
  ];
  return pick(lines);
}

function finisherText(attacker, defender) {
  return `${attacker.name} hits ${defender.name} with the ${attacker.finisher}!`;
}

function calculateDamage(attacker, defender) {
  const attackerStyle = getStyleBonus(attacker.style);
  const defenderStyle = getStyleBonus(defender.style);

  const base = rand(4, 8);
  const powerBonus = Math.floor((attacker.power + attackerStyle.power) / 2);
  const staminaReduction = Math.floor((defender.stamina + defenderStyle.stamina) / 4);

  return Math.max(1, base + powerBonus - staminaReduction);
}

function dodgeCheck(attacker, defender) {
  const attackerStyle = getStyleBonus(attacker.style);
  const defenderStyle = getStyleBonus(defender.style);

  const attackerSpeed = attacker.speed + attackerStyle.speed;
  const defenderSpeed = defender.speed + defenderStyle.speed;

  const dodgeChance = 10 + Math.max(0, defenderSpeed - attackerSpeed) * 4;
  return rand(1, 100) <= dodgeChance;
}

function crowdBuff(wrestler) {
  const styleBonus = getStyleBonus(wrestler.style);
  const charismaScore = wrestler.charisma + styleBonus.charisma;
  return rand(1, 100) <= Math.min(35, charismaScore * 4);
}

function maybeFinisher(attacker, defender) {
  const attackerStyle = getStyleBonus(attacker.style);

  if (defender.hp > 12) return null;

  const chance = 25 + Math.max(0, attacker.charisma + attackerStyle.charisma);
  if (rand(1, 100) > chance) return null;

  const damage = rand(12, 18) + Math.floor((attacker.power + attackerStyle.power) / 2);

  return {
    text: finisherText(attacker, defender),
    damage
  };
}

function cloneFighter(wrestler) {
  return {
    ...wrestler,
    hp: Number(wrestler.hp),
    power: Number(wrestler.power),
    speed: Number(wrestler.speed),
    charisma: Number(wrestler.charisma),
    stamina: Number(wrestler.stamina)
  };
}

function runMatch(w1, w2) {
  const fighter1 = cloneFighter(w1);
  const fighter2 = cloneFighter(w2);

  const log = [];

  log.push(`====================================`);
  log.push(` BBSBUB CHAMPIONSHIP WRESTLING`);
  log.push(`====================================`);
  log.push(`${fighter1.name} enters first.`);
  log.push(`Style: ${fighter1.style} | Finisher: ${fighter1.finisher}`);
  log.push(``);
  log.push(`${fighter2.name} follows.`);
  log.push(`Style: ${fighter2.style} | Finisher: ${fighter2.finisher}`);
  log.push(``);
  log.push(`The bell rings.`);

  let attacker;
  let defender;

  if (fighter1.speed >= fighter2.speed) {
    attacker = fighter1;
    defender = fighter2;
  } else {
    attacker = fighter2;
    defender = fighter1;
  }

  let round = 1;

  while (fighter1.hp > 0 && fighter2.hp > 0 && round <= 30) {
    log.push(``);
    log.push(`--- Round ${round} ---`);

    if (crowdBuff(attacker)) {
      log.push(crowdText(attacker));
    }

    const finisher = maybeFinisher(attacker, defender);

    if (finisher) {
      defender.hp -= finisher.damage;
      log.push(finisher.text);
      log.push(`${defender.name} takes ${finisher.damage} damage.`);
    } else {
      if (dodgeCheck(attacker, defender)) {
        log.push(`${defender.name} dodges at the last second and avoids the attack.`);
      } else {
        const damage = calculateDamage(attacker, defender);
        defender.hp -= damage;
        log.push(normalMoveText(attacker, defender));
        log.push(`${defender.name} takes ${damage} damage.`);
      }
    }

    log.push(`${fighter1.name}: ${Math.max(0, fighter1.hp)} HP`);
    log.push(`${fighter2.name}: ${Math.max(0, fighter2.hp)} HP`);

    if (defender.hp <= 0) {
      log.push(``);
      log.push(`${defender.name} cannot answer the count.`);
      log.push(`Winner: ${attacker.name}`);
      return {
        winner: attacker,
        loser: defender,
        log
      };
    }

    const temp = attacker;
    attacker = defender;
    defender = temp;
    round += 1;
  }

  const winner = fighter1.hp >= fighter2.hp ? fighter1 : fighter2;
  const loser = winner === fighter1 ? fighter2 : fighter1;

  log.push(``);
  log.push(`The time limit expires.`);
  log.push(`Winner by decision: ${winner.name}`);

  return {
    winner,
    loser,
    log
  };
}

export { runMatch };