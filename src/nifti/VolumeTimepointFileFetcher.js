import cornerstoneEvents from './cornerstoneEvents.js';
import FileStreamer from './FileStreamer.js';
import { parseNiftiHeader, parseNiftiFile } from './parseNiftiFile.js';
import unInt8ArrayConcat from '../shared/unInt8ArrayConcat.js';

/**
 * Stream and returns a volume timepoint from a file
 */
export default class VolumeTimepointFileFetcher {
  constructor ({
    method = 'GET',
    responseType = 'arraybuffer',
    beforeSend = noop,
    headers = {},
    onHeadersReceived = noop
  } = {}) {
    this.options = {
      method,
      responseType,
      beforeSend,
      headers,
      onHeadersReceived
    };
    this.imageIdData = {};
    this._NIFTI_HEADER_SIZE = 352;
  }

  fetchTimepoint(imageIdObject) {
    this.ensureStreaming(imageIdObject);

    const fileFetchPromise = new Promise((resolve, reject) => {
      try {
        this.getHeaderPromise(imageIdObject).then((headerData) => {
          VolumeTimepointFileFetcher.parseHeaderData(headerData).then((metaData) => {
            const volumeTimepointLength = VolumeTimepointFileFetcher.getVolumeTimepointDataLength(metaData);
            const offset = this._NIFTI_HEADER_SIZE + (imageIdObject.timePoint * volumeTimepointLength);
            const imageData = this.imageIdData[imageIdObject.filePath];

            // We want to update the buffer to have the full capacity of the volume
            const buffer = new ArrayBuffer(this._NIFTI_HEADER_SIZE + (volumeTimepointLength * metaData.metaData.timeSlices));
            const volumeBuffer = new Uint8Array(buffer);

            volumeBuffer.set(imageData.buffer);
            imageData.buffer = volumeBuffer;

            this.getBufferPromise(imageIdObject, offset, volumeTimepointLength).then((volumeData) => {
              resolve({
                headerData,
                volumeData,
                metaData
              });
            }).catch(reject);
          }).catch(reject);
        });
      } catch (e) {
        reject(e);
      }
    });

    return fileFetchPromise;
  }

  ensureStreaming (imageIdObject) {

    const imageData = this.imageIdData[imageIdObject.filePath] = this.imageIdData[imageIdObject.filePath] || {
      streamer: null,
      buffer: new Uint8Array(0),
      bufferPromiseEntries: [],
      dataStreamedLength: 0
    };

    if (imageData.streamer) {
      return;
    }

    const streamer = new FileStreamer(this.options);

    imageData.streamer = streamer;

    streamer.stream(imageIdObject, (chunck) => {

      if (imageData.dataStreamedLength + chunck.length > imageData.buffer.length) {
        imageData.buffer = unInt8ArrayConcat(imageData.buffer, chunck);
      } else {
        imageData.buffer.set(chunck, imageData.dataStreamedLength);
      }

      imageData.dataStreamedLength += chunck.length;

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
    });
  }

  getHeaderPromise (imageIdObject) {
    return this.getBufferPromise(imageIdObject, 0, this._NIFTI_HEADER_SIZE);
  }

  getBufferPromise(imageIdObject, offset, length) {
    const imageData = this.imageIdData[imageIdObject.filePath];

    const fileStreamPromise = new Promise((resolve, reject) => {
      if (imageData.dataStreamedLength >= length) {
        resolve(imageData.buffer.slice(offset, offset + length));
      } else {
        const bufferPromiseEntry = {
          offset,
          length,
          promise: { resolve, reject }
        };

        imageData.bufferPromiseEntries.push(bufferPromiseEntry);
      }
    });

    return fileStreamPromise;
  }

  static parseHeaderData (headerData) {

    return Promise.resolve ({
      headerData,
      metaData: parseNiftiHeader(headerData.buffer)
    });
  }

  static getVolumeTimepointDataLength(metaData) {
    const dims = metaData.metaData.header.dims;
    const numBitsPerVoxel = metaData.metaData.header.numBitsPerVoxel;
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
