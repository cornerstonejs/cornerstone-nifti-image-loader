/* eslint import/extensions:0 */
import ndarray from 'ndarray';
import ops from 'ndarray-ops';

export default function getDataView (header, imageData, slice) {
  let rowsIndex, columnsIndex, framesIndex;

  switch (slice.dimension) {
  case 'x':
    rowsIndex = 'xyz'.indexOf('z');
    columnsIndex = 'xyz'.indexOf('y');
    framesIndex = 'xyz'.indexOf('x');
    break;

  case 'y':
    rowsIndex = 'xyz'.indexOf('z');
    columnsIndex = 'xyz'.indexOf('x');
    framesIndex = 'xyz'.indexOf('y');
    break;

  case 'z':
    rowsIndex = 'xyz'.indexOf('y');
    columnsIndex = 'xyz'.indexOf('x');
    framesIndex = 'xyz'.indexOf('z');
    break;
  }

  const dimensions = [header.xLength, header.yLength, header.zLength];

  const rows = dimensions[rowsIndex];
  const columns = dimensions[columnsIndex];
  const numberOfFrames = dimensions[framesIndex];
  const rowPixelSpacing = header.pixelSpacing[rowsIndex];
  const columnPixelSpacing = header.pixelSpacing[columnsIndex];
  const slicePixelSpacing = header.pixelSpacing[framesIndex];
  const { rowCosines, columnCosines, rowFlip, columnFlip } = getPatientOrientation(header.orientationMatrix, columnsIndex, rowsIndex);

  const strides = [1, header.xLength, header.xLength * header.yLength];

  // create an ndarray of the whole data, and calculate the min and max values
  let imageDataView = ndarray(imageData, dimensions, strides);
  const minGlobalPixelValue = ops.inf(imageDataView);
  const maxGlobalPixelValue = ops.sup(imageDataView);

  // pick a slice (sliceIndex) according to the wanted dimension (sliceDimension)
  // const dimensionIndex = 'xyz'.indexOf(slice.dimension);
  const slicePick = arrayRotateRight([slice.index, null, null], framesIndex);

  // effectively slice the array on the desired dimension and calculates min
  // and max of the desired slice only
  // it is necessary to tranpose the matrix because cornerstone uses
  // column-major matrices, whereas nifti data is represented row-major
  imageDataView = imageDataView.pick(...slicePick).step(columnFlip, rowFlip).transpose(1, 0);
  const minPixelValue = ops.inf(imageDataView);
  const maxPixelValue = ops.sup(imageDataView);

  return {
    imageDataView,
    metaData: {
      columns,
      rows,
      numberOfFrames,
      columnsIndex,
      rowsIndex,
      framesIndex,
      columnPixelSpacing,
      rowPixelSpacing,
      slicePixelSpacing,
      // when returning, we swap rows/columns because cornerstone is column-major
      // and nifti images are row-major
      columnCosines: rowCosines,
      rowCosines: columnCosines,
      minPixelValue,
      maxPixelValue,
      minGlobalPixelValue,
      maxGlobalPixelValue
    }
  };
}

function getPatientOrientation (matrix, columnsIndex, rowsIndex) {
  // gets the signs of the rotation matrix for the dimension being shown horizontally
  // (columnSign) and the one shown vertically (rowSign)
  const columnSign = matrix[columnsIndex][columnsIndex] < 0 ? -1 : 1;
  const rowSign = matrix[rowsIndex][rowsIndex] < 0 ? -1 : 1;

  // determines if the horizontal (columnFlip) and vertical (rowFlip) pixel data
  // should be flipped
  // horizontal: if the cosine (sign) is '+', we need to flip it, unless*
  //   - rationale: DICOM's x axis grows to the left, NIFTI's grows to the right
  //     * unless we are displaying 'x' on the columns (horizontally), as we
  //              want to display 'left' always on the left side of the image
  // vertical: if the cosine (sign) is '+', we need to flip it
  //   - rationale: DICOM's y axis grows to posterior, NIFTI's grows to anterior
  const columnFlip = (columnsIndex === 0) ? (columnSign === -1) : (columnSign === 1);
  const rowFlip = rowSign === 1;

  let columnCosines = [-matrix[0][columnsIndex], -matrix[1][columnsIndex], matrix[2][columnsIndex]];
  let rowCosines = [-matrix[0][rowsIndex], -matrix[1][rowsIndex], matrix[2][rowsIndex]];

  // if we flipped horizontally or vertically for display, we need to negate
  // the cosines
  if (columnFlip) {
    columnCosines = columnCosines.map((cosine) => -cosine);
  }
  if (rowFlip) {
    rowCosines = rowCosines.map((cosine) => -cosine);
  }

  return {
    rowCosines,
    columnCosines,
    rowFlip: rowFlip ? -1 : 1,
    columnFlip: columnFlip ? -1 : 1
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
