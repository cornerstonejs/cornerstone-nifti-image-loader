import { external } from '../externalModules.js';

const nifti = external.niftiReader;

/**
 * It will normalize NaN or (-)Infinity values to +MAX_VALUE, -MAX_VALUE or 0.
 * It mutates given param
 * 
 * @param {TypedArray} imageData
 * @return {TypedArray} Modified imageData
 */
const normalizeInvalidFloat = (imageData) => {
  for (let it = 0; it < imageData.length; it++) {
    if (isNaN(imageData[it])) {
      // defaults to 0
      imageData[it] = 0;
    } else if (!isFinite(imageData[it])) {
      // using the maximum/minimum value instead of infinity
      imageData[it] = Math.sign(imageData[it]) * Number.MAX_VALUE;
    }
  }

  return imageData;
};

/**
 * Normalize invalid data. Applied to float data only
 * It mutates given imageData
 * @param {string} datatypeCode
 * @param {TypedArray} imageData
 * @return {TypedArray} normalized imageData
 */
export default function normalizeInvalid (datatypeCode, imageData) {

  switch (datatypeCode) {
  case nifti.NIFTI1.TYPE_FLOAT32:
  case nifti.NIFTI1.TYPE_FLOAT64:
    return normalizeInvalidFloat(imageData);
  }

  // return not normalized data
  return imageData;
}
