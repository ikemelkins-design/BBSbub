function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getVoiceLines(wrestler) {
  const base = wrestler?.name || "Unknown Wrestler";
  const alignment = wrestler?.alignment || "neutral";
  const catchphrase = wrestler?.catchphrase || "";
  const style = wrestler?.style || "Wrestler";

  const faceLines = [
    `${base}: "I’m not backing down from anybody."`,
    `${base}: "You want a fight? Step in the ring and earn it."`,
    `${base}: "I fight hard, I fight fair, and I leave it all in the ring."`,
    `${base}: "The fans deserve a real match, and that’s what I’m bringing."`,
  ];

  const heelLines = [
    `${base}: "I’m not here to entertain. I’m here to humiliate."`,
    `${base}: "You don’t belong in my ring."`,
    `${base}: "You were beaten before the bell even rang."`,
    `${base}: "I hurt people for a living. Tonight is no different."`,
  ];

  const neutralLines = [
    `${base}: "I don’t care who they put in front of me."`,
    `${base}: "One more opponent. One more body on the mat."`,
    `${base}: "I came here to win, not to talk."`,
    `${base}: "This business runs on pain. I’m just honest about it."`,
  ];

  const styleFlavor = [
    `${base}: "My ${style.toLowerCase()} game is on another level."`,
    `${base}: "Nobody survives my ${style.toLowerCase()} offense."`,
  ];

  const pool =
    alignment === "face"
      ? [...faceLines, ...styleFlavor]
      : alignment === "heel"
      ? [...heelLines, ...styleFlavor]
      : [...neutralLines, ...styleFlavor];

  const chosen = randomItem(pool);

  if (catchphrase) {
    return `${chosen}\n\n${catchphrase}`;
  }

  return chosen;
}

export function generateCalloutPromo(wrestler, opponent, feudHeat = 0, isTitleMatch = false) {
  const opener = getVoiceLines(wrestler);

  const opponentName = opponent?.name || "whoever is next";
  let extra = "";

  if (isTitleMatch) {
    extra = `\n\n${wrestler.name}: "That title is coming home with me."`;
  } else if (feudHeat >= 5) {
    extra = `\n\n${wrestler.name}: "${opponentName}, I’m not done with you. Not even close."`;
  } else if (feudHeat >= 2) {
    extra = `\n\n${wrestler.name}: "${opponentName}, keep my name out of your mouth unless you want trouble."`;
  } else {
    extra = `\n\n${wrestler.name}: "${opponentName}, I’m calling you out."`;
  }

  return {
    title: `${wrestler.name} cuts a promo`,
    content: `${opener}${extra}`,
  };
}

export function generatePostMatchPromo(winner, loser, feudHeat = 0, isTitleMatch = false) {
  const winnerName = winner?.name || "Unknown Winner";
  const loserName = loser?.name || "Unknown Loser";

  const lines = [
    `"I told you this would happen."`,
    `"That ring belongs to me."`,
    `"You gave me your best, and it still wasn’t enough."`,
    `"Remember this feeling. It’s what losing looks like."`,
  ];

  let content = `${winnerName}: ${randomItem(lines)}`;

  if (isTitleMatch) {
    content += `\n\n${winnerName}: "And now the gold proves it."`;
  }

  if (feudHeat >= 4) {
    content += `\n\n${winnerName}: "${loserName}, if you want more, come get more."`;
  }

  return {
    title: `${winnerName} celebrates victory`,
    content,
  };
}