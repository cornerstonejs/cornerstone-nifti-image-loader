

/**
 * augmentPromise - Adds a state() method to a promise so it can be
 * synchronously queried for its state. This follows the jquery.deferred
 * style.
 *
 * @param  {Promise} original the promise object to be augmented.
 * @return {Promise}          the same promise, but with a state() method.
 */
function augmentPromise (original) {

  if (typeof original.state !== 'function') {
    let state = 'pending';

    original.then((value) => {
      state = 'resolved';

      return value;
    }, (error) => {
      state = 'rejected';

      return error;
    });

    original.state = () => state;
  }

  return original;
}

export default augmentPromise;
