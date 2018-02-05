
/**
 * parsedImageId - Returns an filePath, a sliceDimension and a sliceIndex
 * from a nifti imageId.
 * The format is nifti://filePath#sliceDimension-sliceIndex, with sliceDimension
 * and sliceIndex being optional and defaulting to 'z' and 0 respectively.
 * Examples:
 * - nifti://brain.nii
 * - nifti://brain.nii#46
 * - nifti://brain.nii.gz
 * - nifti://files/patient4/study246/atlas.nii
 * - nifti://collin.nii#x-25
 * - nifti://autumn.nii.gz#y
 * - nifti://wednesday.nii#z-0
 * @example
 * const { filePath, slice } = parsedImageId('nifti://brain.nii#y-10');
 * filePath === 'brain.nii';
 * slice.dimension === 'y';
 * slice.index === 10;
 * @param  {String} imageId the full imageId for a nifti image
 * @return {Object}         an object containing the path for the image (used to
 * fetch it) - filePath, the index of the slice - slice.dimension
 * (default is 'z'), slice.index (default is 0)
 * and booleans wasSliceDimensionDefined and wasSliceIndexDefined indicating
 * if the optional parameters were defined in the imageId or
 * not.
 */
export default function parsedImageId (imageId) {

  /**
   * nifti:filePath(#(sliceDimension-)?sliceIndex?)?
   * - 'nifti://' is constant and should begin the string
   * - '([^#]+)' is the filePath and it should not contain the '#' symbol
   * - '(?:# ...)?' is the '#' symbol indicating the presence of the
   * slice dimension and/or index. The final ? means this is optional
   * - '([xyz])' is the sliceDimension
   * - '([\d]+)' is the sliceIndex
   */
  const imageIdRegex = /^nifti:([^#]+)(?:#(?:(?=[xyz])(?:([xyz])(?:(?=-[\d]+)-([\d]+))?)|(?![xyz])([\d]+)))?$/;
  const regexResults = imageIdRegex.exec(imageId);

  if (!regexResults) {
    throw new Error(`Not in a valid imageId format: ${imageId}`);
  }
  const filePath = regexResults && regexResults[1];
  const sliceDimension = regexResults && regexResults[2] || 'z';
  const sliceIndex = regexResults && parseInt(regexResults[3] || regexResults[4], 0) || 0;

  return {
    filePath,
    slice: {
      dimension: sliceDimension,
      index: sliceIndex
    },
    wasSliceDimensionDefined: typeof regexResults[2] !== 'undefined',
    wasSliceIndexDefined: typeof regexResults[3] !== 'undefined' || typeof regexResults[4] !== 'undefined'
  };
}
