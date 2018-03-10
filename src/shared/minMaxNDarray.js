/**
 * @typedef {Object} MinMax
 * @property {Number} min The minimum value in the array
 * @property {Number} max The maximum value in the array
 */

/**
 * minMaxNDarray - Calculates the minimum and maximum value in a 4D ndarray. This
 * is necessary to provide cornerstone the min and max values of the array of
 * values consisting of the image we're passing to it.
 *
 * Such information is typically found in DICOM files, but we prefer not to
 * rely on it and calculate the values ourselves.
 * @param {Array} values Array of values from which we want to know the minimum
 * and maximum values.
 *
 * @example
 * let result = getMinMax([5, -1, 3])
 * result.min === -1;
 * result.max === 5;
 *
 * @return {MinMax} An object containing minimum
 */
function minMaxNDarray (ndarray) {
  // performance note: a for with vanilla ifs is the most performant way to
  // find min and max values from an array
  // source: https://jsperf.com/determining-min-and-max-value-from-array/1
  let minimum = ndarray.get(0, 0, 0, 0);
  let maximum = minimum;

  /* eslint max-depth: off */
  for (let l = 0; l < ndarray.shape[3]; l++) {
    for (let k = 0; k < ndarray.shape[2]; k++) {
      for (let j = 0; j < ndarray.shape[1]; j++) {
        for (let i = 0; i < ndarray.shape[0]; i++) {
          const currentValue = ndarray.get(i, j, k, l);

          if (currentValue < minimum) {
            minimum = currentValue;
          } else if (currentValue > maximum) {
            maximum = currentValue;
          }
        }
      }
    }
  }

  return {
    min: minimum,
    max: maximum
  };
}

export default minMaxNDarray;
