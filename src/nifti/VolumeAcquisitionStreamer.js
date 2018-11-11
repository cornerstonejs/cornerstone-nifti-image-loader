import Volume from './Volume.js';
import VolumeCache from './VolumeCache.js';
import { parseNiftiFile } from './parseNiftiFile.js';
import convertFloatDataToInteger from './convertFloatDataToInteger.js';
import ImageId from './ImageId.js';
import minMaxNDarray from '../shared/minMaxNDarray.js';
import unInt8ArrayConcat from '../shared/unInt8ArrayConcat.js';
import VolumeTimepointFileFetcher from './VolumeTimepointFileFetcher';

/* eslint import/extensions: off */
import ndarray from 'ndarray';

// private methods symbols
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
export default class VolumeAcquisitionStreamer {

  constructor (httpHeaders = {}) {
    this.volumeCache = new VolumeCache();
    this.volumeFetchers = {};
    this.httpHeaders = httpHeaders;
  }

  static getInstance (httpHeaders) {
    if (!VolumeAcquisitionStreamer.instance) {
      VolumeAcquisitionStreamer.instance = new VolumeAcquisitionStreamer(httpHeaders);
    }

    return VolumeAcquisitionStreamer.instance;
  }

  acquireTimepoint(imageIdObject) {

    // if we have the timepoint already generated, return it immediately.
    const cachedVolume = this.volumeCache.getTimepoint(imageIdObject, imageIdObject.timePoint);

    if (cachedVolume && cachedVolume.hasImageData) {
      Promise.resolve(cachedVolume);

      return;
    }

    const fetcherData = this.getFetcherData(imageIdObject);
    
    if (fetcherData.timePointPromises[imageIdObject.timePoint]) {
      return fetcherData.timePointPromises[imageIdObject.timePoint];
    }

    // if no one has requested this volume yet, we create a promise to acquire it
    const volumeAcquiredPromise = new Promise((resolve, reject) => {

      const fileFetchedPromise = fetcherData.volumeFetcher.fetchTimepoint(imageIdObject.timePoint);

      fileFetchedPromise.
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

    fetcherData.timePointPromises[imageIdObject.timePoint] = volumeAcquiredPromise;

    return volumeAcquiredPromise;
  }

  acquireHeaderOnly (imageIdObject, isRangeRead = true) {
    const fetcherData = this.getFetcherData(imageIdObject);

    if (fetcherData.headerPromise) {
      return fetcherData.headerPromise;
    }

    // if no one has requested the header of this volume yet, we create a
    // promise to acquire it
    const volumeHeaderAcquiredPromise = new Promise((resolve, reject) => {
      const cachedVolume = this.volumeCache.getTimepoint(imageIdObject, imageIdObject.timePoint);

      if (cachedVolume) {
        resolve(cachedVolume);

        return;
      }

      const fetcher = fetcherData.volumeFetcher;
      const fileFetchedPromise = fetcher.getHeaderPromise();

      fileFetchedPromise.
        // creates the volume: metadata + image data
        then((data) => this[createVolume](data, imageIdObject)).
        // adds the volume to the cache
        then((data) => this[cacheVolume](data, imageIdObject)).
        // fulfills the volumeAcquiredPromise
        then((data) => resolve(data)).
        catch(reject);
    });

    // save this promise to the promise cache
    this.volumeFetchers[imageIdObject.filePath] = this.volumeFetchers[imageIdObject.filePath] || {};
    this.volumeFetchers[imageIdObject.filePath].headerOnlyPromise = volumeHeaderAcquiredPromise;

    return volumeHeaderAcquiredPromise;
  }

  [readImageData]({ headerData, metaData, volumeData }) {

    const decompressedFileData = unInt8ArrayConcat(headerData, volumeData);
    // TODO: /*metaData*/ read a fresh copy of the metadata. 
    // The metaData.dataType.TypedArrayConstructor gets lost in next timepoint.
    const { imageData, metaData: moreMetaData } = parseNiftiFile(decompressedFileData.buffer, null);

    Object.assign(metaData, moreMetaData);
    const dimensions = metaData.voxelLength;
    // only 1 timeSlice
    const timeSlices = 1;
    const strides = [
      1,
      dimensions[0],
      dimensions[0] * dimensions[1],
      // each time slice has a stride of x*y*z
      dimensions[0] * dimensions[1] * dimensions[2]];

    // create an ndarray of the whole data
    const imageDataNDarray = ndarray(imageData, [...dimensions, timeSlices], strides);

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
    const timePointImageIdObject = new ImageId(imageIdObject.filePath, imageIdObject.slice, 0);

    return new Volume(timePointImageIdObject, metaData, imageDataNDarray, metaData.floatImageDataNDarray, true);
  }

  [cacheVolume] (volume, imageIdObject) {
    this.volumeCache.add(imageIdObject, volume);

    return volume;
  }

  getFetcherData (imageIdObject) {
    // checks if there is a volume fetcher that may have the data availabile, if not, create and cache.
    this.volumeFetchers[`${imageIdObject.filePath}`] = this.volumeFetchers[`${imageIdObject.filePath}`] ||
      {
        headerPromise: null,
        timePointPromises: [],
        volumeFetcher: new VolumeTimepointFileFetcher(imageIdObject, {
          headers: this.httpHeaders
        })
      };

    return this.volumeFetchers[`${imageIdObject.filePath}`];
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
