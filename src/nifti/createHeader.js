import { external } from '../externalModules.js';
import parseNiftiFile from './parseNiftiFile.js';
import getDataView from './getDataView.js';

export default function createHeader (imageId, rawData, slice) {
  const nifti = external.niftiReader;

  const promise = new Promise(function (resolve, reject) {
    try {
      // uncompress and extract header into meta data and image data
      const { imageData, metaData } = parseNiftiFile(nifti, rawData);
      // prepare the desired view of the data
      const { metaData: sliceRelatedMetaData } = getDataView(metaData, imageData, slice);

      resolve(Object.assign(metaData, sliceRelatedMetaData));
    } catch (error) {
      reject(error);
    }
  });

  return promise;
}
