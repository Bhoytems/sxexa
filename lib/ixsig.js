// Turns a compiled message into one string per instruction (program, data, accounts), so two
// transactions can be compared even when their account indexes differ.
export function ixSigs(msg) {
  const keys = msg.staticAccountKeys;
  return msg.compiledInstructions.map((i) =>
    `${keys[i.programIdIndex].toBase58()}:${Buffer.from(i.data).toString('hex')}:${i.accountKeyIndexes.map((x) => keys[x].toBase58()).join(',')}`);
}
// Wallets such as Phantom may add their own safety instructions, so extras are fine;
// every instruction the server built must be present, in order.
export function containsInOrder(landed, expected) {
  let i = 0;
  for (const x of landed) { if (x === expected[i]) i++; if (i === expected.length) return true; }
  return expected.length === 0;
}
