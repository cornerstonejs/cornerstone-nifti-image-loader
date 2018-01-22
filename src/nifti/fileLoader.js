import { external } from '../externalModules.js';
import fileCache from './fileCache.js';
import { getOptions } from './options.js';

/**
 * loadFile - Loads a file doing an AJAX request to the URI provided by
 * filePath, optionally providing some HTTP headers to be sent.
 *
 * @param  {type} filePath description
 * @return {type}          description
 */
function loadFile (filePath, imageId, {
  headers = { },
  method = 'GET'
} = {}, params = {}) {

  const fileLoaded = new Promise((resolve, reject) => {
    const cachedFile = fileCache.get(filePath);

    if (cachedFile) {
      resolve(cachedFile);

      return;
    }

    const xhr = new XMLHttpRequest();
    const options = getOptions();

    xhr.open(method, filePath, true);
    xhr.responseType = 'arraybuffer';
    options.beforeSend(xhr, imageId);
    Object.keys(headers).forEach((name) => xhr.setRequestHeader(name, headers[name]));

    params.deferred = {
      resolve,
      reject
    };
    params.url = filePath;
    params.imageId = imageId;

    xhr.addEventListener('loadstart', loadStart(filePath, imageId, options, params));
    xhr.addEventListener('loadend', loadEnd(filePath, imageId, options, params));
    xhr.addEventListener('progress', progress(filePath, imageId, options, params));
    xhr.addEventListener('readystatechange', readyStateChange(options, params));

    xhr.send();
  });

  fileLoaded.then((data) => {
    fileCache.add(filePath, data);
  });

  return fileLoaded;
}

// builds a function that is going to be called when the request is loaded
function loadStart (url, imageId, options, params) {
  return function (e) {
    callOptionalEventHook(options.onloadstart, e, params);
    triggerCornerstoneEvent('CornerstoneImageLoadStart', {
      url,
      imageId
    });
  };
}

// builds a function that is going to be called when the request is finished
function loadEnd (url, imageId, options, params) {
  return function (e) {
    callOptionalEventHook(options.onloadend, e, params);
    triggerCornerstoneEvent('CornerstoneImageLoadStart', {
      url,
      imageId
    });
  };
}

// builds a function that is going to be called when there is progress on the
// request response
function progress (url, imageId, options, params) {
  return function (e) {
    const loaded = e.loaded;
    let total;
    let percentComplete;

    if (e.lengthComputable) {
      total = e.total; // e.total the total bytes seted by the header
      percentComplete = Math.round((loaded / total) * 100);
    }

    // Action
    callOptionalEventHook(options.onprogress, e, params);

    // Event
    const eventData = {
      url,
      imageId,
      loaded,
      total,
      percentComplete
    };

    triggerCornerstoneEvent('CornerstoneImageLoadProgress', eventData);
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
        params.deferred.resolve(this.response, this);
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

// dispatches an event on cornerstone for interested watchers (eg, the UI)
function triggerCornerstoneEvent (eventName, data = { }) {
  const eventData = {
    detail: data
  };
  const customEvent = new CustomEvent(eventName.toLowerCase(), eventData);

  external.cornerstone.events.dispatchEvent(customEvent);
}


export default { loadFile };
