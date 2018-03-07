import Volume from './Volume.js';
import VolumeCache from './VolumeCache.js';
import FileFetcher from './FileFetcher.js';
import decompressNiftiData from './decompressNiftiData.js';
import { parseNiftiHeader, parseNiftiFile } from './parseNiftiFile.js';
import convertFloatDataToInteger from './convertFloatDataToInteger.js';
import ImageId from './ImageId.js';
import minMaxNDarray from '../shared/minMaxNDarray.js';

/* eslint import/extensions: off */
import ndarray from 'ndarray';

// private methods symbols
const decompress = Symbol('decompress');
const readMetaData = Symbol('readMetaData');
const readImageData = Symbol('readImageData');
const determineImageDependentMetaData = Symbol('determineImageDependentMetaData');
const transformImageData = Symbol('transformImageData');
const createVolume = Symbol('createVolume');
const cacheVolume = Symbol('cacheVolume');

/* eslint class-methods-use-this: off */

/**
 * A singleton that is responsible for getting a Volume for a NIfTI imageId.
 * It can either get it from its cache, or load a file with an asynchronous
 * request and process it to return the volume. Main method is acquire(imageId).
 */
export default class VolumeAcquisition {

  constructor () {
    this.volumeCache = new VolumeCache();
    this.wholeFileFetcher = new FileFetcher({});
    this.headerOnlyFetcher = new FileFetcher({
      isFirstBytesOnly: true,
      beforeSend: (xhr) => xhr.setRequestHeader('Range', 'bytes=0-10240'),
      onHeadersReceived: (xhr, options, params) => {
        // we wanted only the first bytes, but the server is sending the whole
        // file (status 200 instead of 206)... then, to avoid fetching
        // the whole file twice, we "copy" this fetch promise to the
        // wholeFileFetcher
        if (xhr.status === 200) {
          const imageIdObject = ImageId.fromURL(params.imageId);
          const promiseCacheEntry = this.headerOnlyFetcher.getFetchPromiseFromCache(imageIdObject);

          this.wholeFileFetcher.addFetchPromiseToCache(promiseCacheEntry.promise, imageIdObject);
        }
      }
    });
  }

  static getInstance () {
    if (!VolumeAcquisition.instance) {
      VolumeAcquisition.instance = new VolumeAcquisition();
    }

    return VolumeAcquisition.instance;
  }

  acquire (imageIdObject) {
    const volumeAcquiredPromise = new Promise((resolve, reject) => {
      const cachedVolume = this.volumeCache.get(imageIdObject);

      if (cachedVolume && cachedVolume.hasImageData) {
        resolve(cachedVolume);

        return;
      }

      const fileFetchedPromise = this.wholeFileFetcher.fetch(imageIdObject);

      fileFetchedPromise.
        // decompress (if compressed) the file raw data
        then((data) => this[decompress](data, imageIdObject)).
        // gather meta data of the file/volume
        then((data) => this[readMetaData](data)).
        // reads the image data and puts it in an ndarray (to be sliced)
        then((data) => this[readImageData](data)).
        // transforms the image data (eg float to int, in case)
        then((data) => this[transformImageData](data)).
        // gather meta data that depends on the image data (eg min/max, wc/ww)
        then((data) => this[determineImageDependentMetaData](data)).
        // creates the volume: metadata + image data
        then((data) => this[createVolume](data, imageIdObject)).
        // adds the volume to the cache
        then((data) => this[cacheVolume](data, imageIdObject)).
        // fulfills the volumeAcquiredPromise
        then((data) => resolve(data)).
        catch(reject);
    });

    return volumeAcquiredPromise;
  }

  acquireHeaderOnly (imageIdObject, isRangeRead = true) {
    const volumeHeaderAcquiredPromise = new Promise((resolve, reject) => {
      const cachedVolume = this.volumeCache.get(imageIdObject);

      if (cachedVolume) {
        resolve(cachedVolume);

        return;
      }

      const fetcher = isRangeRead ? this.headerOnlyFetcher : this.wholeFileFetcher;
      const fileFetchedPromise = fetcher.fetch(imageIdObject);

      fileFetchedPromise.
        // decompress (if compressed) the file raw data
        then((data) => this[decompress](data, imageIdObject)).
        // gather meta data of the file/volume
        then((data) => this[readMetaData](data)).
        // creates the volume: metadata + image data
        then((data) => this[createVolume](data, imageIdObject)).
        // adds the volume to the cache
        then((data) => this[cacheVolume](data, imageIdObject)).
        // fulfills the volumeAcquiredPromise
        then((data) => resolve(data)).
        catch(reject);
    });

    return volumeHeaderAcquiredPromise;
  }

  // private methods
  [decompress] (fileRawData, imageIdObject) {
    return decompressNiftiData(fileRawData, imageIdObject);
  }

  [readMetaData] (decompressedFileData) {
    return {
      decompressedFileData,
      metaData: parseNiftiHeader(decompressedFileData)
    };
  }

  [readImageData] ({ decompressedFileData, metaData }) {
    const { imageData, metaData: moreMetaData } = parseNiftiFile(decompressedFileData, metaData);

    Object.assign(metaData, moreMetaData);
    const dimensions = metaData.voxelLength;
    const strides = [1, dimensions[0], dimensions[0] * dimensions[1]];

    // create an ndarray of the whole data
    const imageDataNDarray = ndarray(imageData, dimensions, strides);

    // finds the smallest and largest voxel value
    const minMax = minMaxNDarray(imageDataNDarray);

    metaData.minPixelValue = minMax.min;
    metaData.maxPixelValue = minMax.max;

    return {
      metaData,
      imageDataNDarray
    };
  }

  [transformImageData] ({ metaData, imageDataNDarray }) {

    if (metaData.dataType.isDataInFloat) {
      const conversion = convertFloatDataToInteger(imageDataNDarray, metaData);

      imageDataNDarray = conversion.convertedImageDataView;
      Object.assign(metaData, conversion.metaData, {
        floatImageDataNDarray: conversion.floatImageDataView
      });
    }

    return {
      metaData,
      imageDataNDarray
    };
  }

  [determineImageDependentMetaData] ({ metaData, imageDataNDarray }) {
    if (metaData.isWindowInfoAbsent) {
      // if the window information (min and max values) are absent in the
      // file, we calculate sensible values considering the minimum and
      // maximum pixel values considering not just the slice being shown,
      // but all of them
      Object.assign(metaData, determineWindowValues(metaData.slope, metaData.intercept, metaData.minPixelValue, metaData.maxPixelValue));
    } else {
      Object.assign(metaData, determineWindowValues(1, 0, metaData.windowMinimumValue, metaData.windowMaximumValue));
    }

    return {
      metaData,
      imageDataNDarray
    };
  }

  [createVolume] ({ metaData, imageDataNDarray }, imageIdObject) {
    return new Volume(imageIdObject, metaData, imageDataNDarray, metaData.floatImageDataNDarray);
  }

  [cacheVolume] (volume, imageIdObject) {
    this.volumeCache.add(imageIdObject, volume);

    return volume;
  }
}

function determineWindowValues (slope, intercept, minValue, maxValue) {
  const maxVoi = maxValue * slope + intercept;
  const minVoi = minValue * slope + intercept;

  return {
    windowCenter: (maxVoi + minVoi) / 2,
    windowWidth: (maxVoi - minVoi)
  };
}
