/**
 * @typedef {Object} MinMax
 * @property {Number} min The minimum value in the array
 * @property {Number} max The maximum value in the array
 */

/**
 * getMinMax - Calculates the minimum and maximum value in an array. This is
 * necessary to provide cornerstone the min and max values of the array of
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
function getMinMax (values) {
  // performance note: a for with vanilla ifs is the most performant way to
  // find min and max values from an array
  // source: https://jsperf.com/determining-min-and-max-value-from-array/1
  const numberOfValues = values.length;

  let minimum = values[0];
  let maximum = values[0];

  for (let i = 1; i < numberOfValues; i++) {
    const currentValue = values[i];

    if (currentValue < minimum) {
      minimum = currentValue;
    } else if (currentValue > maximum) {
      maximum = currentValue;
    }
  }

  return {
    min: minimum,
    max: maximum
  };
}

export default getMinMax;
