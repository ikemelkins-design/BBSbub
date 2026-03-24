import { callAgent } from "./wrestling/agentDispatcher";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cleanText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function localPromo({ wrestler, opponent, isTitleMatch, rivalryHeat }) {
  const titleLine = isTitleMatch
    ? `The title is on the line.`
    : `No title is needed for this fight.`;

  const heatLine =
    rivalryHeat >= 8
      ? `This ends tonight.`
      : rivalryHeat >= 5
      ? `I'm not done with you yet.`
      : `You're in my way.`;

  const introOptions = [
    `${wrestler.name} calls out ${opponent.name}.`,
    `${wrestler.name} steps onto the board and names ${opponent.name}.`,
    `${wrestler.name} has a message for ${opponent.name}.`,
  ];

  const contentOptions = [
    `${opponent.name}, you wanted my attention. Now you've got it. ${titleLine} ${heatLine}`,
    `${opponent.name}, step into the ring and find out what happens next. ${titleLine}`,
    `${opponent.name}, talk is cheap. I'm here to finish this. ${heatLine}`,
  ];

  return {
    title: `${wrestler.name} vs ${opponent.name}`,
    content: `${pick(introOptions)} ${pick(contentOptions)}`,
  };
}

function localWinnerReaction({ wrestler, opponent, isTitleMatch }) {
  const options = [
    `${opponent.name} talked big and folded anyway.`,
    `That was never going to end any other way.`,
    `I said I would win, and I did.`,
    isTitleMatch
      ? `Now the title belongs to me.`
      : `Tell them to line up another opponent.`,
  ];

  return `${wrestler.name}: ${pick(options)}`;
}

function localLoserReaction({ wrestler, opponent, rivalryHeat, isTitleMatch }) {
  const options = [
    `You got lucky.`,
    `This isn't over.`,
    `Enjoy it while it lasts.`,
    rivalryHeat >= 6
      ? `We're not finished.`
      : `I'll remember this.`,
    isTitleMatch
      ? `That title isn't staying with you.`
      : `Next time ends differently.`,
  ];

  return `${wrestler.name}: ${pick(options)}`;
}

function localCommentary({ wrestler1, wrestler2, winner, loser, isTitleMatch }) {
  return [
    `${wrestler1.name} and ${wrestler2.name} circle each other as the crowd comes alive.`,
    `${winner.name} starts to find an opening while ${loser.name} tries to slow the pace.`,
    `${loser.name} fires back, but ${winner.name} keeps control of the match.`,
    isTitleMatch
      ? `The pressure rises with the championship hanging in the balance.`
      : `Neither wrestler is willing to give an inch.`,
    `${winner.name} connects with ${winner.finisher || "their finisher"} and puts it away.`,
  ];
}

function localAutonomousThread(wrestler) {
  const titles = [
    `${wrestler.name} has something to say`,
    `${wrestler.name} issues a warning`,
    `${wrestler.name} checks in`,
    `${wrestler.name} is looking for competition`,
    `${wrestler.name} posts a message`,
  ];

  const contents = [
    `I'm here. Someone give me a reason to step into the ring.`,
    `I've been watching this place, and most of you look soft.`,
    `Anybody with a little courage can call me out.`,
    `I'm not waiting around forever. Name the match.`,
    `If you're serious, prove it.`,
  ];

  return {
    title: `${wrestler.name}: ${pick(titles)}`,
    content: `${wrestler.name}: ${pick(contents)}`,
  };
}

function localAutonomousReply(wrestler, thread) {
  const title = thread?.title || "this thread";

  const replies = [
    `I've said what I needed to say about ${title}.`,
    `A lot of noise in here. Not much courage.`,
    `Somebody eventually has to back this up in the ring.`,
    `Keep talking. I'll remember it.`,
    `That sounds good on a message board. It's different under the lights.`,
  ];

  return `${wrestler.name}: ${pick(replies)}`;
}

export async function generateWrestlerPromo({
  wrestler,
  opponent,
  isTitleMatch = false,
  rivalryHeat = 1,
}) {
  if (wrestler?.control_type === "guest_ai") {
    const agentContent = await callAgent(wrestler, {
      type: "promo",
      wrestler: {
        id: wrestler.id,
        name: wrestler.name,
        style: wrestler.style,
        alignment: wrestler.alignment,
        voice: wrestler.voice,
        catchphrase: wrestler.catchphrase,
        persona_prompt: wrestler.persona_prompt,
      },
      opponent: {
        id: opponent?.id,
        name: opponent?.name,
        style: opponent?.style,
        alignment: opponent?.alignment,
      },
      context: {
        isTitleMatch,
        rivalryHeat,
      },
    });

    if (agentContent) {
      return {
        title: `${wrestler.name} vs ${opponent.name}`,
        content: cleanText(agentContent, `${opponent.name}, get in the ring.`),
      };
    }
  }

  return localPromo({
    wrestler,
    opponent,
    isTitleMatch,
    rivalryHeat,
  });
}

export async function generateWrestlerReaction({
  wrestler,
  opponent,
  isWinner = false,
  isTitleMatch = false,
  rivalryHeat = 1,
}) {
  if (wrestler?.control_type === "guest_ai") {
    const agentContent = await callAgent(wrestler, {
      type: "reaction",
      wrestler: {
        id: wrestler.id,
        name: wrestler.name,
        style: wrestler.style,
        alignment: wrestler.alignment,
        voice: wrestler.voice,
        catchphrase: wrestler.catchphrase,
        persona_prompt: wrestler.persona_prompt,
      },
      opponent: {
        id: opponent?.id,
        name: opponent?.name,
        style: opponent?.style,
        alignment: opponent?.alignment,
      },
      context: {
        isWinner,
        isTitleMatch,
        rivalryHeat,
      },
    });

    if (agentContent) {
      return cleanText(agentContent, `${wrestler.name}: ...`);
    }
  }

  if (isWinner) {
    return localWinnerReaction({
      wrestler,
      opponent,
      isTitleMatch,
    });
  }

  return localLoserReaction({
    wrestler,
    opponent,
    rivalryHeat,
    isTitleMatch,
  });
}

export async function generateMatchCommentary({
  wrestler1,
  wrestler2,
  winner,
  loser,
  isTitleMatch = false,
}) {
  if (winner?.control_type === "guest_ai") {
    const agentContent = await callAgent(winner, {
      type: "commentary",
      wrestler: {
        id: winner.id,
        name: winner.name,
        style: winner.style,
        alignment: winner.alignment,
        voice: winner.voice,
        catchphrase: winner.catchphrase,
        persona_prompt: winner.persona_prompt,
      },
      opponent: {
        id: loser?.id,
        name: loser?.name,
        style: loser?.style,
        alignment: loser?.alignment,
      },
      context: {
        isTitleMatch,
        role: "winner_commentary",
      },
    });

    if (agentContent) {
      const splitLines = agentContent
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      if (splitLines.length) {
        return splitLines;
      }
    }
  }

  return localCommentary({
    wrestler1,
    wrestler2,
    winner,
    loser,
    isTitleMatch,
  });
}

export async function generateAutonomousThread({ wrestler }) {
  if (wrestler?.control_type === "guest_ai") {
    const agentContent = await callAgent(wrestler, {
      type: "autonomous_thread",
      wrestler: {
        id: wrestler.id,
        name: wrestler.name,
        style: wrestler.style,
        alignment: wrestler.alignment,
        voice: wrestler.voice,
        catchphrase: wrestler.catchphrase,
        persona_prompt: wrestler.persona_prompt,
      },
      context: {},
    });

    if (agentContent) {
      return {
        title: `${wrestler.name} speaks`,
        content: cleanText(agentContent, `${wrestler.name}: I'm here.`),
      };
    }
  }

  return localAutonomousThread(wrestler);
}

export async function generateAutonomousReply({ wrestler, thread }) {
  if (wrestler?.control_type === "guest_ai") {
    const agentContent = await callAgent(wrestler, {
      type: "autonomous_reply",
      wrestler: {
        id: wrestler.id,
        name: wrestler.name,
        style: wrestler.style,
        alignment: wrestler.alignment,
        voice: wrestler.voice,
        catchphrase: wrestler.catchphrase,
        persona_prompt: wrestler.persona_prompt,
      },
      thread: thread
        ? {
            id: thread.id,
            title: thread.title,
            content: thread.content,
            author: thread.author,
          }
        : null,
      context: {},
    });

    if (agentContent) {
      return cleanText(agentContent, `${wrestler.name}: ...`);
    }
  }

  return localAutonomousReply(wrestler, thread);
}