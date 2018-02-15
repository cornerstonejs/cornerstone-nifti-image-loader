import { external } from '../externalModules.js';
import flattenNDarray from '../shared/flattenNDarray.js';
import arrayRotateRight from '../shared/arrayRotateRight.js';
// import Vector3 from '../shared/Vector3.js';
import { multiplyMatrixAndPoint, transpose} from '../shared/matrixOperations.js';
import * as cornerstoneMath from 'cornerstone-math';

const Vector3 = cornerstoneMath.Vector3;

/* eslint class-methods-use-this: off */
// private methods
const determineMetaData = Symbol('determineMetaData');
const determinePixelData = Symbol('determinePixelData');
const getDimensionsIndices = Symbol('getDimensionsIndices');
const getPatientOrientation = Symbol('getPatientOrientation');
const getPatientPosition = Symbol('getPatientPosition');


/**
 * A slice of a volume that is orthogonal to its i,j,k values (not to x,y,z).
 * The main property is .cornersoneImage, which exposes a
 * Cornerstone Image Object.
 */
export default class Slice {
  constructor (volume, imageIdObject) {
    this.volume = volume;
    this.imageIdObject = imageIdObject;
    this.dimension = imageIdObject.slice.dimension;
    this.index = imageIdObject.slice.index;
    this.metaData = {};

    this[determineMetaData]();
    if (this.volume.hasImageData) {
      this[determinePixelData]();
    }
  }

  [determineMetaData] () {
    const volumeMetaData = this.volume.metaData;
    const { rowsIndex, columnsIndex, framesIndex } = this[getDimensionsIndices](this.dimension);
    const dimensions = [volumeMetaData.xLength, volumeMetaData.yLength, volumeMetaData.zLength];
    const rows = dimensions[rowsIndex];
    const columns = dimensions[columnsIndex];
    const numberOfFrames = dimensions[framesIndex];
    const rowPixelSpacing = volumeMetaData.pixelSpacing[rowsIndex];
    const columnPixelSpacing = volumeMetaData.pixelSpacing[columnsIndex];
    const slicePixelSpacing = volumeMetaData.pixelSpacing[framesIndex];
    const { rowCosines, columnCosines, rowFlip, columnFlip } = this[getPatientOrientation](volumeMetaData.orientationMatrix, columnsIndex, rowsIndex);
    // const patientPosition = this[getPatientPosition](volumeMetaData.orientationMatrix, framesIndex, columns, rows, columnCosines, rowCosines, columnPixelSpacing, rowPixelSpacing, slicePixelSpacing, rowFlip, columnFlip);
    const patientPosition = this[getPatientPosition](volumeMetaData.orientationMatrix, framesIndex, columns, rows, columnCosines, rowCosines, columnPixelSpacing, rowPixelSpacing, slicePixelSpacing, rowFlip, columnFlip);

    Object.assign(this.metaData, {
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
      rowFlip,
      columnFlip,
      patientPosition
    });
  }

  [determinePixelData] () {
    this.volume.imageDataNDarray.set(0, 0, 0, 255);
    // pick a slice (sliceIndex) according to the wanted dimension (sliceDimension)
    // const dimensionIndex = 'xyz'.indexOf(slice.dimension);
    const slicePick = arrayRotateRight([this.index, null, null], this.metaData.framesIndex);
    const { columnFlip, rowFlip } = this.metaData;
    const imageDataView = this.volume.imageDataNDarray.pick(...slicePick).
      step(columnFlip, rowFlip);

    imageDataView.set(0, 0, 128);

    const isDataInFloat = this.volume.metaData.dataType.isDataInFloat;
    const TypeArrayConstructor = isDataInFloat ? Uint16Array : this.volume.metaData.dataType.TypedArrayConstructor;

    this.pixelData = flattenNDarray(imageDataView, TypeArrayConstructor);

    // if the data was originally in float values, we also slice the
    // original float ndarray
    if (isDataInFloat) {
      const floatImageDataView = this.volume.imageDataNDarray.pick(...slicePick).
        step(columnFlip, rowFlip).
        transpose(1, 0);

      this.floatPixelData = flattenNDarray(floatImageDataView, this.volume.metaData.dataType.TypedArrayConstructor);
    }
  }

  [getDimensionsIndices] (sliceDimension) {
    let rowsIndex, columnsIndex, framesIndex;

    switch (sliceDimension) {
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

    return {
      rowsIndex,
      columnsIndex,
      framesIndex
    };
  }

  [getPatientOrientation] (matrix, columnsIndex, rowsIndex) {
    // gets the signs of the rotation matrix for the dimension being shown horizontally
    // (columnSign) and the one shown vertically (rowSign)
    // const columnSign = matrix[columnsIndex][columnsIndex] < 0 ? -1 : 1;
    // const rowSign = matrix[rowsIndex][rowsIndex] <= 0 ? -1 : 1;

    // determines if the horizontal (columnFlip) and vertical (rowFlip) pixel data
    // should be flipped
    // horizontal: if the cosine (sign) is '+', we need to flip it, unless*
    //   - rationale: DICOM's x axis grows to the left, NIFTI's grows to the right
    //     * unless we are displaying 'x' on the columns (horizontally), as we
    //              want to display 'left' always on the left side of the image
    // vertical: if the cosine (sign) is '+', we need to flip it
    //   - rationale: DICOM's y axis grows to posterior, NIFTI's grows to anterior
    // const columnFlip = (columnsIndex === 0) ? (columnSign === -1) : (columnSign === 1);
    // const rowFlip = rowSign === 1;

    let columnCosines = [-matrix[0][columnsIndex], -matrix[1][columnsIndex], matrix[2][columnsIndex]];
    let rowCosines = [-matrix[0][rowsIndex], -matrix[1][rowsIndex], matrix[2][rowsIndex]];

    // if we flipped horizontally or vertically for display, we need to negate
    // the cosines
    // if (columnFlip) {
    //   columnCosines = columnCosines.map((cosine) => -cosine);
    // }
    // if (rowFlip) {
    //   rowCosines = rowCosines.map((cosine) => -cosine);
    // }

    return {
      rowCosines: new Vector3(...rowCosines).normalize().toArray(),
      columnCosines: new Vector3(...columnCosines).normalize().toArray(),
      // rowFlip: rowFlip ? -1 : 1,
      // columnFlip: columnFlip ? -1 : 1
    };
  }

  [getPatientPosition] (matrix, dimensionIndex, columns, rows) {
    const ijkPoint = arrayRotateRight([this.index, 0, 0], dimensionIndex);

    // duplicates the matrix
    matrix = JSON.parse(JSON.stringify(matrix));


    matrix[0][0] *= -1;
    matrix[0][1] *= -1;
    matrix[0][2] *= -1;
    matrix[0][3] *= -1;

    matrix[1][0] *= -1;
    matrix[1][1] *= -1;
    matrix[1][2] *= -1;
    matrix[1][3] *= -1;

    matrix = transpose(matrix);

    const position = multiplyMatrixAndPoint([].concat.apply([], matrix), [...ijkPoint, 1]);

    return position.slice(0, 3);
  }
  //
  // [getPatientPosition] (matrix, dimensionIndex, columns, rows, columnCosines, rowCosines, columnPixelSpacing, rowPixelSpacing, slicePixelSpacing, rowFlip, columnFlip) {
  //   const volumeOriginVector = [(matrix[0][0] * columns) + matrix[0][3], (matrix[1][1] * rows) + matrix[1][3], matrix[2][3]];
  //   const topLeftVoxelPosition = new Vector3(...volumeOriginVector);
  //   // const topLeftVoxelPosition = bottomRightVoxelPosition.clone();
  //
  //
  //   // const xPositionShift = new Vector3(...columnCosines).multiplyScalar(columnPixelSpacing * columns);
  //   // const yPositionShift = new Vector3(...rowCosines).multiplyScalar(rowPixelSpacing * rows);
  //   //
  //   //
  //   // topLeftVoxelPosition.sub(xPositionShift);
  //   // topLeftVoxelPosition.sub(yPositionShift);
  //
  //   const vectorTowardsSlices = new Vector3(...rowCosines).cross(new Vector3(...columnCosines));
  //
  //   vectorTowardsSlices.normalize();
  //
  //
  //   // TODO convert to mm in case it is not in mm
  //   const position = topLeftVoxelPosition.add(vectorTowardsSlices.multiplyScalar(this.index * slicePixelSpacing));
  //
  //
  //   return position.toArray();
  // }
  // [getPatientPosition] (matrix, dimensionIndex, rowCosines, columnCosines, slicePixelSpacing) {
  //   const translationVector = [-matrix[0][3], -matrix[1][3], matrix[2][3]];
  //   const bottomLeftVoxelPosition = new Vector3(...translationVector);
  //   const vectorTowardsSlices = new Vector3(...rowCosines).cross(new Vector3(...columnCosines));
  //
  //   vectorTowardsSlices.normalize();
  //
  //   if (dimensionIndex === 0 || dimensionIndex === 1) {
  //     vectorTowardsSlices.negate();
  //   }
  //
  //   // TODO convert to mm in case it is not in mm
  //   const position = bottomLeftVoxelPosition.add(vectorTowardsSlices.multiplyScalar(this.index * slicePixelSpacing));
  //
  //
  //   return position.toArray();
  // }

  get cornerstoneImageObject () {
    const volumeMetaData = this.volume.metaData;
    const sliceMetaData = this.metaData;
    const cornerstone = external.cornerstone;
    const render = volumeMetaData.dataType.isDataInColors
      ? cornerstone.renderColorImage
      : cornerstone.renderGrayscaleImage;


    return {
      imageId: this.imageIdObject.url,
      color: volumeMetaData.dataType.isDataInColors,
      columnPixelSpacing: sliceMetaData.columnPixelSpacing,
      columns: sliceMetaData.columns,
      height: sliceMetaData.rows,
      intercept: volumeMetaData.intercept,
      invert: false,
      minPixelValue: volumeMetaData.minPixelValue,
      maxPixelValue: volumeMetaData.maxPixelValue,
      rowPixelSpacing: sliceMetaData.rowPixelSpacing,
      rows: sliceMetaData.rows,
      sizeInBytes: this.pixelData.byteLength,
      slope: volumeMetaData.slope,
      width: sliceMetaData.columns,
      windowCenter: volumeMetaData.windowCenter,
      windowWidth: volumeMetaData.windowWidth,
      floatPixelData: this.floatPixelData,
      decodeTimeInMS: 0,
      getPixelData: () => this.pixelData,
      render
    };
  }

  get compoundMetaData () {
    return Object.assign({}, this.volume.metaData, this.metaData);
  }
}
