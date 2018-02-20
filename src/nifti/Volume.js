import Slice from './Slice.js';

const convertToNeurologicalView = Symbol('convertToNeurologicalView');
const convertRAStoLPS = Symbol('convertRAStoLPS');

export default class Volume {
  constructor (metaData, imageDataNDarray, floatImageDataNDarray) {
    this.metaData = metaData;
    this.imageDataNDarray = imageDataNDarray;
    this.floatImageDataNDarray = floatImageDataNDarray;

    this[convertToNeurologicalView]();
    this[convertRAStoLPS]();
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
    const orientationString = this.metaData.orientationString;
    const dimensionOrderingInData = orientationString.slice(0, 3); // eg 'XYZ'
    const senses = orientationString.slice(3, 6); // eg, '-++'
    const matrix = this.metaData.orientationMatrix;
    const steps = [1, 1, 1];

    switch (dimensionOrderingInData) {
    case 'XYZ':
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
      break;

    default:
      console.info(`Nifti file with a somewhat funky orientation...
        not doing auto flipping to match the neurological view`);
    }

    this.imageDataNDarray = this.imageDataNDarray.step(...steps);
    if (this.floatImageDataView) {
      this.floatImageDataNDarray = this.floatImageDataNDarray.step(...steps);
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
    return new Slice(this, imageIdObject);
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
