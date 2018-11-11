import * as http from 'stream-http';
import cornerstoneEvents from './cornerstoneEvents.js';

export default class FileStreamer {
  constructor (options) {
    this.options = {
      headers: options && options.headers || {}
    };
  }

  stream (imageIdObject, handleChunk) {
    let fileStreamPromise = null;

    fileStreamPromise = new Promise((resolve, reject) => {
      const eventParams = {
        promise: {
          resolve,
          reject
        },
        url: imageIdObject.filePath,
        imageId: imageIdObject.url
      };

      const request = http.get({ path: imageIdObject.filePath,
        headers: this.options.headers },
      (response) => {
        const contentLength = response.headers['Content-Length'] || response.headers['content-length'] || 0;
        const progressCallback = progress(imageIdObject.filePath, imageIdObject.url, this.options, eventParams);
        let bytesRead = 0;

        response.on('data', (chunk) => {
          bytesRead += chunk.length;

          progressCallback({
            detail: {
              loaded: bytesRead,
              total: contentLength
            }
          });
          handleChunk(chunk, imageIdObject);
        });

        response.on('end', () => {
          resolve();
        });
      });

      request.on('error', (e) => {
        const errorDescription = `Could not fetch the file '${imageIdObject.url}'. Error description: ${e}.`;

        reject(new Error(errorDescription));
      });
    });

    return fileStreamPromise;
  }
}

// builds a function that is going to be called when there is progress on the
// request response
function progress (url, imageId, options, params) {
  return function (e) {
    const loaded = e.detail.loaded;
    const total = e.detail.total;
    const percentComplete = Math.round((loaded / total) * 100);

    // action
    callOptionalEventHook(options.onprogress, e, params);

    // event
    const eventData = {
      url,
      imageId,
      loaded,
      total,
      percentComplete
    };

    cornerstoneEvents.imageLoadProgress(eventData);
  };
}

// calls an eventual hook function present in the options
function callOptionalEventHook (hook, e, params) {
  if (hook) {
    hook(e, params);
  }
}
