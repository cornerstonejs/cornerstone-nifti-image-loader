import { external } from '../externalModules.js';
import flattenNDarray from '../shared/flattenNDarray.js';
import arrayRotateRight from '../shared/arrayRotateRight.js';
import multiplyMatrixAndPoint from '../shared/multiplyMatrixAndPoint.js';
import normalizeVector from '../shared/normalizeVector.js';

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
  constructor(volume, imageIdObject, isSingleTimepoint = false) {
    this.volume = volume;
    this.imageIdObject = imageIdObject;
    this.dimension = imageIdObject.slice.dimension;
    this.index = imageIdObject.slice.index;
    this.timePoint = isSingleTimepoint ? 0 : imageIdObject.timePoint;
    this.metaData = {};

    this[determineMetaData]();
    if (this.volume.hasImageData) {
      this[determinePixelData]();
    }
  }

  [determineMetaData] () {
    const volumeMetaData = this.volume.metaData;
    const { rowsIndex, columnsIndex, framesIndex } = this[getDimensionsIndices](this.dimension);
    const dimensions = volumeMetaData.voxelLength;
    const rows = dimensions[rowsIndex];
    const columns = dimensions[columnsIndex];
    const numberOfFrames = dimensions[framesIndex];
    const rowPixelSpacing = volumeMetaData.pixelSpacing[rowsIndex];
    const columnPixelSpacing = volumeMetaData.pixelSpacing[columnsIndex];
    const slicePixelSpacing = volumeMetaData.pixelSpacing[framesIndex];
    const { rowCosines, columnCosines } = this[getPatientOrientation](volumeMetaData.orientationMatrix, columnsIndex, rowsIndex);
    const patientPosition = this[getPatientPosition](volumeMetaData.orientationMatrix, framesIndex);

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
      columnCosines,
      rowCosines,
      imagePositionPatient: patientPosition,
      imageOrientationPatient: [...rowCosines, ...columnCosines],
      frameOfReferenceUID: this.imageIdObject.filePath
    });
  }

  [determinePixelData] () {
    this.volume.imageDataNDarray.set(0, 0, 0, 255);
    // pick a slice (sliceIndex) according to the wanted dimension (sliceDimension)
    // const dimensionIndex = 'xyz'.indexOf(slice.dimension);
    const slicePick = arrayRotateRight([this.index, null, null], this.metaData.framesIndex);
    const TypeArrayConstructor = this.volume.metaData.dataType.TypedArrayConstructor;
    const imageDataView = this.volume.imageDataNDarray.pick(...slicePick, this.timePoint);

    this.pixelData = flattenNDarray(imageDataView, TypeArrayConstructor);

    // if the data was originally in float values, we also slice the
    // original float ndarray
    const isDataInFloat = this.volume.metaData.dataType.isDataInFloat;

    if (isDataInFloat) {
      const floatImageDataView = this.volume.imageDataNDarray.pick(...slicePick, this.timePoint);

      this.floatPixelData = flattenNDarray(floatImageDataView, this.volume.metaData.dataType.OriginalTypedArrayConstructor);
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
    const rowCosines = [matrix[0][columnsIndex], matrix[1][columnsIndex], matrix[2][columnsIndex]];
    const columnCosines = [matrix[0][rowsIndex], matrix[1][rowsIndex], matrix[2][rowsIndex]];

    return {
      rowCosines: normalizeVector(rowCosines),
      columnCosines: normalizeVector(columnCosines)
    };
  }

  [getPatientPosition] (matrix, dimensionIndex) {
    const ijkPoint = arrayRotateRight([this.index, 0, 0], dimensionIndex);
    const position = multiplyMatrixAndPoint(matrix, ijkPoint);

    // return the point, discarding the homogeneous coordinate
    return position.slice(0, 3);
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
