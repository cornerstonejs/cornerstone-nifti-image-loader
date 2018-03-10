/**
 * flattenNDarray - Returns a 1D version of the provided 2D ndarray. The type
 * of the returned array is the same as the one provided as the second argument.
 *
 * @param  {ndarray} ndarray                The 2D ndarray to be flattened.
 * @param  {function} TypedArrayConstructor The type with which to construct
 * the flattened array.
 * @return {constructor}                    The 1D flattened array.
 */
export default function flattenNDarray (ndarray, TypedArrayConstructor = Array) {
  const result = new TypedArrayConstructor(ndarray.size);
  let idx = 0;

  for (let j = 0; j < ndarray.shape[1]; ++j) {
    for (let i = 0; i < ndarray.shape[0]; ++i) {
      result[idx++] = ndarray.get(i, j);
    }
  }

  return result;
}
