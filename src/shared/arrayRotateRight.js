/**
 * arrayRotateRight - Circularly rotates an array to the right: shifts elements
 * to the right, pushing the last one to the first position.
 *
 * @param  {Array} array      The array being rotated. It gets changed and is
 * also returned.
 * @param  {Number} times = 1 Number of positions to shift. Defaults to 1.
 * @return {Array}            The array, rotated.
 */
export default function arrayRotateRight (array, times = 1) {
  while (times-- > 0) {
    array.unshift(array.pop());
  }

  return array;
}
