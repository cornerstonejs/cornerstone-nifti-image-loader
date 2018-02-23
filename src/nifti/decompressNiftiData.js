import { external } from '../externalModules.js';

const dependencies = {
  nifti: external.niftiReader
};


/**
 * decompressNiftiData - Decompresses (if necessary) a nifti file data.
 *
 * @param  {ArrayBuffer} rawData the raw file data (compressed or not).
 * @return {ArrayBuffer}         the decompressed file data.
 */
export default function decompressNiftiData (rawData, imageIdObject) {
  const nifti = dependencies.nifti;

  let fileData = rawData;

  // decompresses the file, if necessary
  if (nifti.isCompressed(rawData)) {
    fileData = nifti.decompress(rawData);
  }

  if (!nifti.isNIFTI(fileData)) {
    throw new Error(`The file '${imageIdObject.filePath}' is not a valid NIFTI file.`);
  }

  return fileData;
}
