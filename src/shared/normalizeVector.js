function sumOfSquares (accumulator, currentValue) {
  return accumulator + currentValue * currentValue;
}

export default function normalizeVector (values = []) {
  const vectorLengthSquared = values.reduce(sumOfSquares, 0);
  const vectorLength = Math.sqrt(vectorLengthSquared);

  return values.map((v) => v / vectorLength);
}
