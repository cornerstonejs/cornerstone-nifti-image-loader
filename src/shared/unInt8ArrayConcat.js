 export default function unInt8ArrayConcat (first, second) {
  const firstLength = first.length;
  const result = new Uint8Array(firstLength + second.length);

  result.set(first);
  result.set(second, firstLength);

  return result;
}