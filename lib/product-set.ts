export function isSet(name: string) {
  return /pok[eé]mon|^POK\s/i.test(name) && /(?:30\s*jahre|\b30th\b)/i.test(name)
    && /karten|tcg|booster|kollektion|collection|edition|trainer|bundle|etb|display|\btin\b|kampfdeck|blister|knock.?out/i.test(name)
    && !/plüsch|plush|portfolio|protector|sleeve|spielmatte|deck.?box|handbuch|puzzle|memory|labyrinth|first.partner|erster.partner|pok[eé]mon.day/i.test(name);
}
