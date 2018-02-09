import Volume from './Volume.js';
import VolumeCache from './VolumeCache.js';
import FileFetcher from './FileFetcher.js';
import decompressNiftiData from './decompressNiftiData.js';
import { parseNiftiHeader, parseNiftiFile } from './parseNiftiFile.js';
import convertFloatDataToInteger from './convertFloatDataToInteger.js';

/* eslint import/extensions: off */
import ndarray from 'ndarray';
import ops from 'ndarray-ops';

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
    this.fetcher = new FileFetcher({});
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

      if (cachedVolume) {
        resolve(cachedVolume);

        return;
      }

      const fileFetchedPromise = this.fetcher.fetch(imageIdObject);

      fileFetchedPromise.
        // decompress (if compressed) the file raw data
        then((data) => this[decompress](data)).
        // gather meta data of the file/volume
        then((data) => this[readMetaData](data)).
        // reads the image data and puts it in an ndarray (to be sliced)
        then((data) => this[readImageData](data)).
        // transforms the image data (eg float to int, in case)
        then((data) => this[transformImageData](data)).
        // gather meta data that depends on the image data (eg min/max, wc/ww)
        then((data) => this[determineImageDependentMetaData](data)).
        // creates the volume: metadata + image data
        then((data) => this[createVolume](data)).
        // adds the volume to the cache
        then((data) => this[cacheVolume](data, imageIdObject)).
        // fulfills the volumeAcquiredPromise
        then((data) => resolve(data)).
        catch(reject);
    });

    return volumeAcquiredPromise;
  }

  // private methods
  [decompress] (fileData) {
    return decompressNiftiData(fileData);
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
    const dimensions = [metaData.xLength, metaData.yLength, metaData.zLength];
    const strides = [1, metaData.xLength, metaData.xLength * metaData.yLength];

    // create an ndarray of the whole data
    const imageDataNDarray = ndarray(imageData, dimensions, strides);

    // finds the smallest and largest voxel value
    metaData.minPixelValue = ops.inf(imageDataNDarray);
    metaData.maxPixelValue = ops.sup(imageDataNDarray);

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

  [createVolume] ({ metaData, imageDataNDarray }) {
    return new Volume(metaData, imageDataNDarray, metaData.floatImageDataNDarray);
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
