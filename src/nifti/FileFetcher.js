import cornerstoneEvents from './cornerstoneEvents.js';

const getFetchPromiseFromCache = Symbol('getFetchPromiseFromCache');
const addFetchPromiseToCache = Symbol('addFetchPromiseToCache');

/**
 * Fetches files and notifies Cornerstone of the relevant events.
 */
export default class FileFetcher {
  constructor ({
    method = 'GET',
    responseType = 'arraybuffer',
    beforeSend = noop
  } = {}) {
    this.options = {
      method,
      responseType,
      beforeSend
    };
    this.promisesCache = {};
  }

  fetch (imageIdObject) {
    const cachedFileFetchPromise = this[getFetchPromiseFromCache](imageIdObject);
    let fileFetchPromise;

    if (cachedFileFetchPromise) {
      fileFetchPromise = cachedFileFetchPromise.promise;

    } else {
      fileFetchPromise = new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const eventParams = {
          deferred: {
            resolve,
            reject
          },
          url: imageIdObject.filePath,
          imageId: imageIdObject.url
        };

        request.open(this.options.method, imageIdObject.filePath, true);
        request.responseType = this.options.responseType;
        if (typeof this.options.beforeSend === 'function') {
          this.options.beforeSend(request, imageIdObject.url);
        }

        request.addEventListener('readystatechange', readyStateChange(this.options, eventParams));
        request.addEventListener('progress', progress(imageIdObject.filePath, imageIdObject.url, this.options, eventParams));

        request.send();
      });

      this[addFetchPromiseToCache](fileFetchPromise, imageIdObject);
    }

    return fileFetchPromise;
  }

  [getFetchPromiseFromCache] (imageIdObject) {
    const promisesForThisFile = this.promisesCache[imageIdObject.filePath];

    return Array.isArray(promisesForThisFile) && promisesForThisFile.find((entry) => entry.fetcher === this);
  }

  [addFetchPromiseToCache] (promise, imageIdObject) {
    this.promisesCache[imageIdObject.filePath] = this.promisesCache[imageIdObject.filePath] || [];
    this.promisesCache[imageIdObject.filePath].push(
      new FetchPromiseCacheEntry(this, imageIdObject, promise)
    );
  }
}

class FetchPromiseCacheEntry {
  constructor (fetcher, imageIdObject, promise) {
    this.fetcher = fetcher;
    this.imageIdObject = imageIdObject;
    this.promise = promise;
  }
}

// builds a function that is going to be called when there is progress on the
// request response
function progress (url, imageId, options, params) {
  return function (e) {
    const loaded = e.loaded;
    let total;
    let percentComplete;

    if (e.lengthComputable) {
      total = e.total; // e.total the total bytes set by the header
      percentComplete = Math.round((loaded / total) * 100);
    }

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

// builds a function that is going to be called when the request changes state
function readyStateChange (options, params) {
  return function (e) {
    callOptionalEventHook(options.onreadystatechange, e, params);
    if (options.onreadystatechange) {
      return;
    }

    if (this.readyState === 4) {
      if ([200, 206].includes(this.status)) {
        params.deferred.resolve(this.response);
      } else {
        params.deferred.reject(this);
      }
    }
  };
}

// calls an eventual hook function present in the options
function callOptionalEventHook (hook, e, params) {
  if (hook) {
    hook(e, params);
  }
}

function noop () {
}
