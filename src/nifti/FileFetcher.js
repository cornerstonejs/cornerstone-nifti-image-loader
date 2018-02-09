import cornerstoneEvents from './cornerstoneEvents.js';

export default class FileFetcher {
  constructor ({
    method = 'GET',
    responseType = 'arraybuffer',
    beforeSend = noop
  }) {
    this.options = {
      method,
      responseType,
      beforeSend
    };
  }

  fetch (imageIdObject) {
    return new Promise((resolve, reject) => {
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
      if (this.status === 200) {
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
