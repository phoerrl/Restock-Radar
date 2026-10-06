export function isSet(name: string) {
  return /pok[eé]mon/i.test(name) && /(?:30\s*jahre|30th\s*(?:anniversary\s*)?celebration)/i.test(name)
    && /karten|tcg|booster|kollektion|collection|edition|trainer|bundle|etb|display|\btin\b/i.test(name)
    && !/plüsch|plush|portfolio|protector|sleeve|spielmatte|deck.?box|handbuch|puzzle|memory|labyrinth/i.test(name);
}
