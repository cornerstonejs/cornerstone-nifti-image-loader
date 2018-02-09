import { external } from '../externalModules.js';
import flattenNDarray from '../shared/flattenNDarray.js';
import arrayRotateRight from '../shared/arrayRotateRight.js';

/* eslint class-methods-use-this: off */
// private methods
const determineMetaData = Symbol('determineMetaData');
const determinePixelData = Symbol('determinePixelData');
const getDimensionsIndices = Symbol('getDimensionsIndices');
const getPatientOrientation = Symbol('getPatientOrientation');


/**
 * An orthogonal slice of a volume. The main property is .cornersoneImage,
 * which exposes a Cornerstone Image Object.
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
      columnFlip
    });
  }

  [determinePixelData] () {
    // pick a slice (sliceIndex) according to the wanted dimension (sliceDimension)
    // const dimensionIndex = 'xyz'.indexOf(slice.dimension);
    const slicePick = arrayRotateRight([this.index, null, null], this.metaData.framesIndex);
    const { columnFlip, rowFlip } = this.metaData;
    const imageDataView = this.volume.imageDataNDarray.pick(...slicePick).
      step(columnFlip, rowFlip).
      transpose(1, 0);

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
