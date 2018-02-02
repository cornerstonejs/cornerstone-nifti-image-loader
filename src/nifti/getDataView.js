/* eslint import/extensions:0 */
import ndarray from 'ndarray';
import ops from 'ndarray-ops';

export default function getDataView (header, imageData, slice) {
  // determines the number of columns and rows of the image
  let rows, columns, numberOfFrames;
  let rowPixelSpacing, columnPixelSpacing;

  switch (slice.dimension) {
  case 'x':
    rows = header.zLength;
    columns = header.yLength;
    numberOfFrames = header.xLength;
    rowPixelSpacing = header.pixelSpacing[3];
    columnPixelSpacing = header.pixelSpacing[2];
    break;

  case 'y':
    rows = header.zLength;
    columns = header.xLength;
    numberOfFrames = header.yLength;
    rowPixelSpacing = header.pixelSpacing[3];
    columnPixelSpacing = header.pixelSpacing[1];
    break;

  case 'z':
    rows = header.yLength;
    columns = header.xLength;
    numberOfFrames = header.zLength;
    rowPixelSpacing = header.pixelSpacing[2];
    columnPixelSpacing = header.pixelSpacing[1];
    break;
  }

  const dimensions = [header.xLength, header.yLength, header.zLength];
  const strides = [1, header.xLength, header.xLength * header.yLength];

  // pick a slice (sliceIndex) according to the wanted dimension (sliceDimension)
  const dimensionIndex = 'xyz'.indexOf(slice.dimension);
  const slicePick = arrayRotateRight([slice.index, null, null], dimensionIndex);

  // create an ndarray of the whole data, and calculate the min and max values
  let imageDataView = ndarray(imageData, dimensions, strides);
  const minGlobalPixelValue = ops.inf(imageDataView);
  const maxGlobalPixelValue = ops.sup(imageDataView);

  // effectively slice the array on the desired dimension and calculates min
  // and max of the desired slice only
  imageDataView = imageDataView.pick(...slicePick).transpose(1, 0).step(-1, -1, 1);
  const minPixelValue = ops.inf(imageDataView);
  const maxPixelValue = ops.sup(imageDataView);

  return {
    imageDataView,
    metaData: {
      rows,
      columns,
      numberOfFrames,
      rowPixelSpacing,
      columnPixelSpacing,
      minPixelValue,
      maxPixelValue,
      minGlobalPixelValue,
      maxGlobalPixelValue
    }
  };
}


/**
 * arrayRotateRight - Circularly rotates an array to the right: shifts elements
 * to the right, pushing the last one to the first position.
 *
 * @param  {Array} array     The array being rotated. It gets changed and is
 * also returned.
 * @param  {Number} times = 1 Number of positions to shift. Defaults to 1.
 * @return {Array}           The array, rotated.
 */
function arrayRotateRight (array, times = 1) {
  while (times-- > 0) {
    array.unshift(array.pop());
  }

  return array;
}
