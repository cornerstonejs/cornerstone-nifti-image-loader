import { external } from '../externalModules.js';
import pako from 'pako';
import FileStreamer from './FileStreamer.js';
import { parseNiftiHeader } from './parseNiftiFile.js';
import unInt8ArrayConcat from '../shared/unInt8ArrayConcat.js';

const niftiReader = external.niftiReader;
const _NIFTI1_HEADER_OFFSET = 352;
const _NIFTI2_HEADER_OFFSET = 544;

/**
 * Stream and returns a volume timepoint from a file
 */
export default class VolumeTimepointFileFetcher {
  constructor(imageIdObject, {
    method = 'GET',
    responseType = 'arraybuffer',
    beforeSend = noop,
    headers = {},
    onHeadersReceived = noop
  } = {}) {

    this.imageId = imageIdObject;
    this.options = {
      method,
      responseType,
      beforeSend,
      headers,
      onHeadersReceived
    };
    this.volumeData = VolumeTimepointFileFetcher.createDefaultVolumeData();
  }

  fetchTimepoint (timepoint = 0) {
    this.ensureStreaming(this.imageId);

    const fileFetchPromise = new Promise((resolve, reject) => {
      try {
        this.getHeaderPromise().then((header) => {
          const volumeTimepointLength = VolumeTimepointFileFetcher.getVolumeTimepointDataLength(header);
          const offset = this.volumeData.headerOffset + (timepoint * volumeTimepointLength);

          this.getBufferPromise(offset, volumeTimepointLength).then((volumeData) => {
            resolve({
              headerData: header.headerData,
              volumeData,
              metaData: header.metaData
            });
          }).catch(reject);
        });
      } catch (e) {
        reject(e);
      }
    });

    return fileFetchPromise;
  }

  ensureStreaming (imageIdObject) {

    const imageData = this.volumeData;

    if (imageData.streamer) {
      return;
    }

    const streamer = new FileStreamer(this.options);

    imageData.streamer = streamer;

    VolumeTimepointFileFetcher.runStreamer(imageIdObject, imageData);
  }

  static runStreamer (imageIdObject, imageData) {
    imageData.streamer.stream(imageIdObject, (chunk) => {
      if (!imageData.headerParsed) {
        if (!VolumeTimepointFileFetcher.tryParseHeader(imageData, chunk)) {
          return;
        }

        // Now we have the header parsed
        imageData.headerPromiseMethods.resolve(imageData.header);
        VolumeTimepointFileFetcher.evaluatePromises(imageData);

        imageData.headerParsed = true;

        return;
      }

      if (imageData.isCompressed) {
        chunk = VolumeTimepointFileFetcher.uncompress(imageData, chunk);
      }

      VolumeTimepointFileFetcher.addToImageDataBuffer(imageData, chunk);

      VolumeTimepointFileFetcher.evaluatePromises(imageData);
    });
  }

  getHeaderPromise () {
    this.ensureStreaming(this.imageId);
    const imageData = this.volumeData;

    if (imageData.header) {
      return Promise.resolve(imageData.header);
    }

    return imageData.headerPromise;
  }

  getBufferPromise (offset, length) {
    this.ensureStreaming(this.imageId);
    const fileStreamPromise = new Promise((resolve, reject) => {
      if (this.volumeData.dataStreamedLength >= length) {
        resolve(this.volumeData.buffer.slice(offset, offset + length));
      } else {
        const bufferPromiseEntry = {
          offset,
          length,
          promise: {
            resolve,
            reject
          }
        };

        this.volumeData.bufferPromiseEntries.push(bufferPromiseEntry);
      }
    });

    return fileStreamPromise;
  }

  static evaluatePromises (imageData) {
    let index = imageData.bufferPromiseEntries.length - 1;

    while (index >= 0) {
      const entry = imageData.bufferPromiseEntries[index];
      const totalLength = entry.offset + entry.length;

      if (imageData.dataStreamedLength >= totalLength) {

        imageData.bufferPromiseEntries.splice(index, 1);

        entry.promise.resolve(imageData.buffer.slice(entry.offset, entry.offset + entry.length));
      }

      index--;
    }
  }

  static createDefaultVolumeData () {
    const headerPromiseMethods = {};
    const headerPromise = new Promise((resolve, reject) => {
      headerPromiseMethods.resolve = resolve;
      headerPromiseMethods.reject = reject;
    });

    return {
      streamer: null,
      buffer: new Uint8Array(0),
      bufferPromiseEntries: [],
      dataStreamedLength: 0,
      isCompressed: false,
      tmpBuffer: new Uint8Array(0),
      headerParsed: false,
      inflator: new pako.Inflate(),
      headerPromise,
      headerPromiseMethods,
      // Assume it is NiFTI-1 until proven otherwise.
      headerOffset: _NIFTI1_HEADER_OFFSET
    };
  }

  static parseHeaderData (headerData) {

    return {
      headerData,
      metaData: parseNiftiHeader(headerData.buffer)
    };
  }

  static uncompress (imageData, chunk) {
    if (chunk.length === 0) {
      return chunk;
    }

    imageData.inflator.push(chunk, pako.Z_SYNC_FLUSH);

    return imageData.inflator.result;
  }

  static addToImageDataBuffer (imageData, chunk) {
    if (imageData.dataStreamedLength + chunk.length > imageData.buffer.length) {
      imageData.buffer = unInt8ArrayConcat(imageData.buffer, chunk);
    } else {
      imageData.buffer.set(chunk, imageData.dataStreamedLength);
    }

    imageData.dataStreamedLength += chunk.length;
  }

  static tryParseHeader (imageData, chunk) {
    if (imageData.isHeaderTypeKnown) {
      if (imageData.isCompressed) {
        chunk = VolumeTimepointFileFetcher.uncompress(imageData, chunk);
      }

      VolumeTimepointFileFetcher.addToImageDataBuffer(imageData, chunk);

      const canParse = imageData.dataStreamedLength >= imageData.headerOffset;

      if (canParse) {
        imageData.header = VolumeTimepointFileFetcher.parseHeaderData(imageData.buffer.slice(0, imageData.headerOffset));

        const volumeBuffer = VolumeTimepointFileFetcher.createVolumeBuffer(imageData);

        volumeBuffer.set(imageData.buffer);
        imageData.buffer = volumeBuffer;
      }

      return canParse;
    }

    if (imageData.tmpBuffer.length + chunk.length < imageData.headerOffset) {
      // we don't have enough data, lets add it and wait for next chunk
      imageData.tmpBuffer = unInt8ArrayConcat(imageData.tmpBuffer, chunk);

      return false;
    }


    // we don't want to add the chunk now to tmpBuffer/buffer. This will be handlded by recursion
    let tempBuffer = unInt8ArrayConcat(imageData.tmpBuffer, chunk);

    imageData.isCompressed = niftiReader.isCompressed(tempBuffer.buffer);
    
    if (imageData.isCompressed) {
      const inflator = new pako.Inflate();

      inflator.push(tempBuffer, pako.Z_SYNC_FLUSH);

      tempBuffer = inflator.result;
    }

    // we have at least enough to know what kind of NiFTI is this
    if (niftiReader.isNIFTI2(tempBuffer.buffer)) {
      imageData.headerOffset = _NIFTI2_HEADER_OFFSET;
    }

    imageData.isHeaderTypeKnown = true;
    // we know what type of data we have, we shouldn't be using the temp buffer anymore
    imageData.buffer = (imageData.isCompressed) ? VolumeTimepointFileFetcher.uncompress(imageData, imageData.tmpBuffer) : imageData.tmpBuffer;
    imageData.dataStreamedLength = imageData.buffer.length;
    imageData.tmpBuffer = undefined;

    // recursion, now we should satisfy the "isHeaderTypeKnown"
    return VolumeTimepointFileFetcher.tryParseHeader(imageData, chunk);
  }

  static createVolumeBuffer (imageData) {
    const volumeTimepointLength = VolumeTimepointFileFetcher.getVolumeTimepointDataLength(imageData.header);
    const offset = imageData.headerOffset;

    // We want to update the buffer to have the full capacity of the volume
    const buffer = new ArrayBuffer(offset + (volumeTimepointLength * imageData.header.metaData.timeSlices));

    return new Uint8Array(buffer);
  }

  static getVolumeTimepointDataLength(header) {
    const dims = header.metaData.header.dims;
    const numBitsPerVoxel = header.metaData.header.numBitsPerVoxel;
    const timeDim = 1;
    let statDim = 1;

    if (dims[5]) {
      statDim = dims[5];
    }

    return dims[1] * dims[2] * dims[3] * timeDim * statDim * (numBitsPerVoxel / 8);
  }
}

function noop () {
}
