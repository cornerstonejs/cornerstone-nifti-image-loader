import parsedImageId from './parsedImageId.js';
import fileLoader from './fileLoader.js';
import createImage from './createImage.js';
import metaDataProvider from './metaData/metaDataProvider.js';

const nifti = {
  loadImage (imageId) {
    const { imagePath, sliceIndex } = parsedImageId(imageId);

    const promise = fileLoader.loadFile(imagePath, imageId).then(
      (data) => createImage(imageId, data, sliceIndex));

    return { promise };
  },
  register (cornerstone) {
    cornerstone.registerImageLoader('nifti', this.loadImage);
    cornerstone.metaData.addProvider(metaDataProvider);
  }
};

export default nifti;
