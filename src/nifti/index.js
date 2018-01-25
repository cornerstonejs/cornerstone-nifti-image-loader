import parsedImageId from './parsedImageId.js';
import fileLoader from './fileLoader.js';
import createImage from './createImage.js';
import { metaDataProvider } from './metaData/metaDataProvider.js';

const nifti = {
  loadImage (imageId) {
    const { filePath, sliceDimension, sliceIndex } = parsedImageId(imageId);

    const promise = fileLoader.loadFile(filePath, imageId).then(
      (data) => createImage(imageId, data, sliceDimension, sliceIndex));

    return { promise };
  },
  register (cornerstone) {
    cornerstone.registerImageLoader('nifti', this.loadImage);
    cornerstone.metaData.addProvider(metaDataProvider);
  }
};

export default nifti;
