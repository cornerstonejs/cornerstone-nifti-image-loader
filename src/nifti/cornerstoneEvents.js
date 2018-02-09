import { external } from '../externalModules.js';

/**
 * triggerCornerstoneEvent - Triggers a cornerstone event.
 *
 * @param  {String} eventName  the event name.
 * @param  {Object} data = {}  the details of the event.
 */
function triggerCornerstoneEvent (eventName, data = {}) {
  const eventData = {
    detail: data
  };
  const customEvent = new CustomEvent(eventName, eventData);

  external.cornerstone.events.dispatchEvent(customEvent);
}

export default {
  imageLoadProgress: (data) => triggerCornerstoneEvent('cornerstoneimageloadprogress', data),
  imageLoadStart: (data) => triggerCornerstoneEvent('cornerstoneimageloadstart', data),
  imageLoadEnd: (data) => triggerCornerstoneEvent('cornerstoneimageloadend', data)
};
