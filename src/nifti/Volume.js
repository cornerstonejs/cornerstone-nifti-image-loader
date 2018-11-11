/* eslint import/extensions: off */
import Slice from './Slice.js';
import ndarray from 'ndarray';

const convertToNeurologicalView = Symbol('convertToNeurologicalView');
const ensureVoxelStorageInXYZ = Symbol('ensureVoxelStorageInXYZ');
const changeVoxelStorageOrder = Symbol('changeVoxelStorageOrder');
const convertRAStoLPS = Symbol('convertRAStoLPS');

export default class Volume {
  constructor (imageIdObject, metaData, imageDataNDarray, floatImageDataNDarray, isSingleTimepoint = false) {
    this.imageIdObject = imageIdObject;
    this.metaData = metaData;
    this.imageDataNDarray = imageDataNDarray;
    this.floatImageDataNDarray = floatImageDataNDarray;
    this.isSingleTimepoint = isSingleTimepoint;
    this[ensureVoxelStorageInXYZ]();
    this[convertToNeurologicalView]();
    this[convertRAStoLPS]();
  }


  /**
   * ensureVoxelStorageInXYZ - Changes, if necessary, the order in which
   * voxels have been stored in this volume so it matches XYZ.
   * If a change is necessary, the voxel ordering is changed, as well as
   * the orietantion matrix and other metadata, such as pixel spacing and
   * voxel matrix lengths.
   *
   */
  [ensureVoxelStorageInXYZ] () {
    const orientationString = this.metaData.orientationString;
    const voxelStorageOrder = orientationString.slice(0, 3); // eg 'XYZ'

    switch (voxelStorageOrder) {
    case 'XYZ':
      // no need to change anything...
      break;

    case 'XZY':
      // changes the voxel ordering in the volume to be XYZ
      this[changeVoxelStorageOrder]([0, 2, 1]);
      break;

    case 'YZX':
      // changes the voxel ordering in the volume to be XYZ
      this[changeVoxelStorageOrder]([2, 0, 1]);
      break;

    default:
      console.info(`The NIfTI file ${this.imageIdObject.filePath} has its
        voxel values stored in ${voxelStorageOrder} order in the file,
        which is a rare orientation unsupported by the viewer. Hence,
        the viewer is not doing auto flipping to match the neurological view.`);
    }
  }


  /**
   * changeVoxelStorageOrder - Changes the voxel ordering and the appropriate
   * metadata so it matches XYZ ordering. The parameter indicate the index
   * of each dimension that will be mapped to x, y and z.
   *
   * @param  {type} [x index of patient's 'x' in the original voxel storage.
   * @param  {type} y  index of patient's 'y'.
   * @param  {type} z] index of patient's 'z'.
   */
  [changeVoxelStorageOrder] ([x, y, z]) {
    // changes the order in which voxel data is stored
    if (this.hasImageData) {
      this.imageDataNDarray = this.imageDataNDarray.transpose(x, y, z, 3);
      if (this.floatImageDataNDarray) {
        this.floatImageDataNDarray = this.floatImageDataNDarray.transpose(x, y, z, 3);
      }
    }

    // changes the voxel data length to match new order
    this.metaData.voxelLength = [
      this.metaData.voxelLength[x],
      this.metaData.voxelLength[y],
      this.metaData.voxelLength[z]
    ];

    // changes the orientation matrix according to the dimension rearrangement
    const matrix = this.metaData.orientationMatrix;
    const matrixCopy = JSON.parse(JSON.stringify(matrix));
    const matrixTranspose = ndarray([].concat(...matrixCopy), [4, 4]).transpose(1, 0);
    const matrixTransposeLines = [
      matrixTranspose.pick(0, null),
      matrixTranspose.pick(1, null),
      matrixTranspose.pick(2, null),
      matrixTranspose.pick(3, null)
    ];

    matrix[0] = [matrixTransposeLines[x].get(0), matrixTransposeLines[x].get(1), matrixTransposeLines[x].get(2), matrixTransposeLines[3].get(x)];
    matrix[1] = [matrixTransposeLines[y].get(0), matrixTransposeLines[y].get(1), matrixTransposeLines[y].get(2), -matrixTransposeLines[3].get(y)];
    matrix[2] = [matrixTransposeLines[z].get(0), matrixTransposeLines[z].get(1), matrixTransposeLines[z].get(2), -matrixTransposeLines[3].get(z)];

    // changes the pixel spacing according to the new order
    [...this.metaData.pixelSpacing] = [
      this.metaData.pixelSpacing[x],
      this.metaData.pixelSpacing[y],
      this.metaData.pixelSpacing[z]];

    // changes the order of the signs of the axes
    const orientationString = this.metaData.orientationString;
    let senses = orientationString.slice(3, 6); // eg, '-++'

    senses = [senses[x], senses[y], senses[z]].join('');
    this.metaData.orientationString = `XYZ${senses}`;
  }


  /**
   * convertToNeurologicalView - Changes the data array and the
   * orientation matrix to match the neurological view: patient right on the
   * right of the screen, anterior on the top, or to the right.
   *
   */
  [convertToNeurologicalView] () {
    // the orientationString is created by NIFTI-Reader-JS and has 6 characters
    // (e.g., XYZ+--), in which the first 3 represent the order in
    // which the patient dimensions are stored in the
    // image data (typically it's XYZ) and also in which sense each direction
    // grows positive (compared to RAS). For example, a NIFTI file with the
    // image data coded as LAS would have an orientationString of XYZ-++, with
    // the negative sign representing the flip of R to L

    const matrix = this.metaData.orientationMatrix;
    const senses = this.metaData.orientationString.slice(3, 6); // eg, '-++'
    const steps = [1, 1, 1];

    if (this.metaData.orientationString.slice(0, 3) === 'XYZ') {
      // if 'X-', we need to flip x axis so patient's right is
      // shown on the right
      if (senses[0] === '-') {
        matrix[0][0] *= -1;
        matrix[0][1] *= -1;
        matrix[0][2] *= -1;
        matrix[0][3] *= -1;
        steps[0] = -1;
      }
      // if 'Y+' we need to flip y axis so patient's anterior is shown on the
      // top
      if (senses[1] === '+') {
        matrix[1][0] *= -1;
        matrix[1][1] *= -1;
        matrix[1][2] *= -1;
        matrix[1][3] *= -1;
        steps[1] = -1;
      }
      // if 'Z+' we need to flip z axis so patient's head is shown on the top
      if (senses[2] === '+') {
        matrix[2][0] *= -1;
        matrix[2][1] *= -1;
        matrix[2][2] *= -1;
        matrix[2][3] *= -1;
        steps[2] = -1;
      }
    }


    if (this.hasImageData) {
      this.imageDataNDarray = this.imageDataNDarray.step(...steps, 1);
      if (this.floatImageDataNDarray) {
        this.floatImageDataNDarray = this.floatImageDataNDarray.step(...steps, 1);
      }
    }
  }

  /**
   * convertRAStoLPS - converts the orientation matrix from standard nifti
   * orientation of RAS to dicom's LPS so it matches cornerstone expectation
   * of dicom's image orientation (i.e., row cosines, column cosines). That is
   * achieved by doing a 180deg rotation on the z axis, which is equivalent to
   * flipping the signs of the first 2 rows.
   *
   */
  [convertRAStoLPS] () {
    const matrix = this.metaData.orientationMatrix;

    // flipping the first row is equivalent to doing a 180deg rotation on 'z',
    // which achieves going from RAS (nifti orientation) to LPS (dicom's)
    matrix[0][0] *= -1;
    matrix[0][1] *= -1;
    matrix[0][2] *= -1;
    matrix[0][3] *= -1;

    matrix[1][0] *= -1;
    matrix[1][1] *= -1;
    matrix[1][2] *= -1;
    matrix[1][3] *= -1;
  }

  slice (imageIdObject) {
    return new Slice(this, imageIdObject, this.isSingleTimepoint);
  }

  get hasImageData () {
    return this.imageDataNDarray && this.imageDataNDarray.data && this.imageDataNDarray.data.byteLength > 0;
  }

  get sizeInBytes () {
    const integerArraySize = this.imageDataNDarray ? this.imageDataNDarray.data.byteLength : 0;
    const floatArraySize = this.floatImageDataView ? this.floatImageDataView.data.byteLength : 0;

    return integerArraySize + floatArraySize;
  }
}
