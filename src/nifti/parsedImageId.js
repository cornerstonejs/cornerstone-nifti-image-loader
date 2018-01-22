
/**
 * parsedImageId - Returns an imagePath and a sliceIndex from a nifti imageId.
 * The format is nifti:imagePath#sliceIndex, with sliceIndex being optional
 * and defaulting to 0. Examples:
 * - nifti:brain.nii
 * - nifti:brain.nii#46
 * - nifti:brain.nii.gz
 * - nifti:files/patient4/study246/atlas.nii
 * @param  {type} imageId the full imageId for a nifti image
 * @return {type}         an object containing the path for the image (used to
 * fetch it) - imagePath, the index of the slice - sliceIndex (default is 0)
 * and a boolean indicating if the slice index was defined in the imageId or
 * not - wasSliceDefined (eg, it is false for 'nifti:brain.nii' and true for
 * 'nifti:brain.nii#25').
 */
function parsedImageId (imageId) {

  /**
   * nifti:imagePath(#sliceIndex)?
   * - 'nifti:' is constant and should begin the string
   * - '([^#]+)' is the imagePath and it should not contain the '#' symbol
   * - '(?:# ...)?' is the '#' symbol indicating the presence of the slice index
   *   as we don't want '#', but only the number after it, it is a non-capturing
   *   group. The final ? means this is optional
   * - '([\d]+)' is the sliceIndex
   */
  const imageIdRegex = /^nifti:([^#]+)(?:#([\d]+))?/;
  const regexResults = imageIdRegex.exec(imageId);
  const imagePath = regexResults && regexResults[1];
  const sliceIndex = regexResults && regexResults[2] || 0;

  return {
    imagePath,
    sliceIndex,
    wasSliceDefined: typeof regexResults[2] === 'undefined'
  };
}

export default parsedImageId;
