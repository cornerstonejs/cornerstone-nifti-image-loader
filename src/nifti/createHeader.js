/* eslint import/extensions:0 */
import { external } from '../externalModules.js';
import parseNiftiFile from './parseNiftiFile.js';

export default function createHeader (imageId, rawData) {
  const nifti = external.niftiReader;

  const promise = new Promise(function (resolve, reject) {
    try {
      // uncompress and extract header into meta data and image data
      const { metaData } = parseNiftiFile(nifti, rawData);

      resolve(metaData);
    } catch (error) {
      reject(error);
    }
  });

  return promise;
}
