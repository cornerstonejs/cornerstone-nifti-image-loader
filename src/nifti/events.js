export default function Events (target = this) {
  let events = {};
  const empty = [];

  target.on = (type, func, ctx) => {
    (events[type] = events[type] || []).push([func, ctx]);

    return target;
  };

  target.off = (type, func) => {
    if (!type) {
      events = {};
    }
    const list = events[type] || empty;
    let i = list.length = func ? list.length : 0;

    while (i--) {
      func == list[i][0] && list.splice(i,1);
    }

    return target;
  };

  target.emit = (type) => {
    const e = events[type] || empty;
    const list = e.length > 0 ? e.slice(0, e.length) : e;
    let i = 0;
    let j;

    while ((j = list[i++])) {
      j[0].apply(j[1], empty.slice.call(arguments, 1));
    }

    return target;
  };
}
