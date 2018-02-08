export default function flattenNDarray (ndarray, TypedArrayConstructor) {
  const result = new TypedArrayConstructor(ndarray.size);
  let idx = 0;

  for (let i = 0; i < ndarray.shape[0]; ++i) {
    for (let j = 0; j < ndarray.shape[1]; ++j) {
      result[idx++] = ndarray.get(i, j);
    }
  }

  return result;
}
