import * as http from 'stream-http';
import cornerstoneEvents from './cornerstoneEvents.js';

export default class FileStreamer {
  constructor (options) {
    this.options = {
      headers: options && options.headers || {}
    };
    // this.promisesCache = {};
  }

  stream (imageIdObject, handleChunk) {
    // const cachedStreamPromise = this.getStreamPromiseFromCache(imageIdObject);
    let fileStreamPromise = null;

    // if (cachedStreamPromise) {
    // fileStreamPromise = cachedStreamPromise;
    const a = false;

    if (a) {
      console.log('yaya');
    } else {
      fileStreamPromise = new Promise((resolve, reject) => {
        const eventParams = {
          promise: {
            resolve,
            reject
          },
          url: imageIdObject.filePath,
          imageId: imageIdObject.url
        };

        // const { hostname, path } = parseFilePath(imageIdObject.filePath);
        // const requestOptions = {
        //   hostname,
        //   path,
        //   headers: this.options.headers
        // };

        const request = http.get(imageIdObject.filePath, (response) => {
        // const request = http.get(requestOptions, (response) => {
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

        Object.keys(this.options.headers).forEach((name) => {
          request.setHeader(name, this.options.headers[name]);
        });

        request.on('error', (e) => {
          const errorDescription = `Could not fetch the file '${imageIdObject.url}'. Error description: ${e}.`;

          reject(new Error(errorDescription));
        });
      });
    }

    return fileStreamPromise;
  }


  // getStreamPromiseFromCache (imageIdObject) {
  //   return this.promisesCache[imageIdObject.filePath];
  // }
  //
  // addStreamPromiseToCache (imageIdObject, promise) {
  //   this.promisesCache[imageIdObject.filePath] = promise;
  // }
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

function parseFilePath (filePath) {
  const queryStringIndex = filePath.indexOf('/');
  const hostname = queryStringIndex > -1 ? filePath.slice(0, queryStringIndex) : filePath;
  const path = queryStringIndex > -1 ? filePath.slice(queryStringIndex) : '';

  return {
    hostname,
    path
  };
}
