import metaDataManager from './metaData/metaDataManager.js';
import { metaDataProvider } from './metaData/metaDataProvider.js';
import VolumeAcquisition from './VolumeAcquisition.js';
import VolumeStreamer from './VolumeStreamer.js';
import ImageId from './ImageId.js';
import augmentPromise from './augmentPromise.js';
import cornerstoneEvents from './cornerstoneEvents.js';

const options = {
  headers: {}
};

const nifti = {
  loadImage (imageId) {
    let promise;

    try {
      const imageIdObject = ImageId.fromURL(imageId);
      const volumeAcquisition = VolumeAcquisition.getInstance(options.headers);

      cornerstoneEvents.imageLoadStart(imageIdObject);

      promise = volumeAcquisition.acquire(imageIdObject).
        then((volume) => volume.slice(imageIdObject)).
        then((slice) => {
          metaDataManager.add(imageIdObject.url, slice.compoundMetaData);
          cornerstoneEvents.imageLoadEnd(imageIdObject);

          return slice.cornerstoneImageObject;
        });

    } catch (error) {
      promise = Promise.reject(error);
    }

    // temporary 'hack' to make the loader work with applications that expect
    // jquery.deferred promises (such as the StudyPrefetcher in OHIF)
    promise = augmentPromise(promise);

    // temporary 'hack' to make the loader work on both cornerstone@1 and @2
    // @1 expected a promise to be returned directly, whereas @2 expects an
    // object like { promise, cancelFn }
    promise.promise = promise;

    return promise;
  },

  loadImageStreamed (imageId) {
    let promise;

    try {
      const imageIdObject = ImageId.fromURL(imageId);
      const volumeStreamer = VolumeStreamer.getInstance(options.headers);

      cornerstoneEvents.imageLoadStart(imageIdObject);

      promise = volumeStreamer.stream(imageIdObject).
        then((result) => {

          console.log('yay', result);
        });

    } catch (error) {
      promise = Promise.reject(error);
    }

    // temporary 'hack' to make the loader work with applications that expect
    // jquery.deferred promises (such as the StudyPrefetcher in OHIF)
    promise = augmentPromise(promise);

    // temporary 'hack' to make the loader work on both cornerstone@1 and @2
    // @1 expected a promise to be returned directly, whereas @2 expects an
    // object like { promise, cancelFn }
    promise.promise = promise;

    return promise;
  },

  loadHeader (imageId, isRangeRead = true) {
    let promise;

    try {
      const imageIdObject = ImageId.fromURL(imageId);
      const volumeAcquisition = VolumeAcquisition.getInstance(options.headers);

      promise = volumeAcquisition.acquireHeaderOnly(imageIdObject, isRangeRead).
        then((volume) => volume.slice(imageIdObject)).
        then((slice) => {
          metaDataManager.add(imageIdObject.url, slice.compoundMetaData);

          return slice.compoundMetaData;
        });

    } catch (error) {
      promise = Promise.reject(error);
    }

    // temporary 'hack' to make the loader work with applications that expect
    // jquery.deferred promises (such as the StudyPrefetcher in OHIF)
    promise = augmentPromise(promise);

    // temporary 'hack' to make the loader work on both cornerstone@1 and @2
    // @1 expected a promise to be returned directly, whereas @2 expects an
    // object like { promise, cancelFn }
    promise.promise = promise;

    return promise;
  },

  ImageId,

  register (cornerstone) {
    cornerstone.registerImageLoader('nifti', this.loadImageStreamed);
    cornerstone.metaData.addProvider(metaDataProvider);
  },

  configure (loaderOptions) {
    Object.assign(options, loaderOptions);
  }
};

export default nifti;
