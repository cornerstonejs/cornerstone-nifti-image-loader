import { external } from '../externalModules.js';

const dependencies = {
  nifti: external.niftiReader
};

export default function decompressNiftiData (rawData) {
  const nifti = dependencies.nifti;

  let fileData = rawData;

  // decompresses the file, if necessary
  if (nifti.isCompressed(rawData)) {
    fileData = nifti.decompress(rawData);
  }

  if (!nifti.isNIFTI(fileData)) {
    throw new Error('The file being loaded is not a valid NIFTI file.');
  }

  return fileData;
}
