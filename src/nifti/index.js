import parsedImageId from './parsedImageId.js';
import fileLoader from './fileLoader.js';
import createImage from './createImage.js';
import createHeader from './createHeader.js';
import { metaDataProvider } from './metaData/metaDataProvider.js';

const nifti = {
  loadImage (imageId) {
    const { filePath, slice } = parsedImageId(imageId);
    const promise = fileLoader.loadFile(filePath, imageId).then(
      (data) => createImage(imageId, data, slice));

    // temporary 'hack' to make the loader work on both cornerstone@1 and @2
    // @1 expected a promise to be returned directly, whereas @2 expects an
    // object like { promise, cancelFn }
    promise.promise = promise;

    return promise;
  },

  loadHeader (imageId) {
    const { filePath } = parsedImageId(imageId);

    return fileLoader.loadFile(filePath, imageId).then(
      (data) => createHeader(imageId, data));
  },

  parseImageId: parsedImageId,

  register (cornerstone) {
    cornerstone.registerImageLoader('nifti', this.loadImage);
    cornerstone.metaData.addProvider(metaDataProvider);
  }
};

export default nifti;
