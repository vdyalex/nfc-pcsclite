'use strict';

const EventEmitter = require('events');

// pcsclite.node is a Node.js native C++ addon that is compiled during installation
// via node-gyp (see package.json > scripts > install)
// the build output name and directory is constant so we can require it directly
// see https://github.com/nodejs/node-gyp/issues/263, https://github.com/nodejs/node-gyp/issues/631
const pcsclite = require('./build/Release/pcsclite.node');

const { PCSCLite, CardReader } = pcsclite;

inherits(PCSCLite, EventEmitter);
inherits(CardReader, EventEmitter);

function parseReadersString(buffer) {
  try {
    const string = buffer.toString().slice(0, -1);

    // it looks like
    // ACS ACR122U PICC Interface\u0000ACS ACR122U PICC Interface 01\u0000\u0000
    // [reader_name]\u0000[reader_name]\u0000\u0000
    //              ^separator         ^separator^end_separator

    // returns readers in array
    // like [ 'ACS ACR122U PICC Interface', 'ACS ACR122U PICC Interface 01' ]

    return string.split('\u0000').slice(0, -1);
  } catch (e) {
    return [];
  }
}

/*
 * It returns an array with the elements contained in a that aren't contained in b
 */
function diff(a, b) {
  return a.filter(function (index) {
    return b.indexOf(index) === -1;
  });
}

module.exports = function (timeout) {
  const readers = {};

  const pcsc = new PCSCLite();

  pcsc.readers = readers;

  process.nextTick(function () {
    pcsc.start(function (error, data) {
      if (error) {
        return pcsc.emit('error', error);
      }

      const names = parseReadersString(data);
      const currentNames = Object.keys(readers);
      const newNames = diff(names, currentNames);
      const removedNames = diff(currentNames, names);

      newNames.forEach(function (name) {
        const reader = new CardReader(name);

        reader.on('_end', function () {
          reader.removeAllListeners('status');
          delete readers[name];
          reader.emit('end');
        });

        readers[name] = reader;

        reader.get_status(function (error, state, atr) {
          if (error) {
            return reader.emit('error', error);
          }

          const status = { state: state };

          if (atr) {
            status.atr = atr;
          }

          reader.emit('status', status);

          reader.state = state;
        });

        pcsc.emit('reader', reader);
      });

      removedNames.forEach(function (name) {
        readers[name].close();
      });
    }, timeout);
  });

  return pcsc;
};

CardReader.prototype.connect = function (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};
  options.share_mode = options.share_mode || this.SCARD_SHARE_EXCLUSIVE;

  if (typeof options.protocol === 'undefined' || options.protocol === null) {
    options.protocol = this.SCARD_PROTOCOL_T0 | this.SCARD_PROTOCOL_T1;
  }

  if (!this.connected) {
    this._connect(options.share_mode, options.protocol, callback);
  } else {
    callback();
  }
};

CardReader.prototype.disconnect = function (disposition, callback) {
  if (typeof disposition === 'function') {
    callback = disposition;
    disposition = undefined;
  }

  if (typeof disposition !== 'number') {
    disposition = this.SCARD_UNPOWER_CARD;
  }

  if (this.connected) {
    this._disconnect(disposition, callback);
  } else {
    callback();
  }
};

CardReader.prototype.transmit = function (data, length, protocol, callback) {
  if (!this.connected) {
    return callback(new Error('Card Reader not connected'));
  }

  this._transmit(data, length, protocol, callback);
};

CardReader.prototype.control = function (data, code, length, callback) {
  if (!this.connected) {
    return callback(new Error('Card Reader not connected'));
  }

  const output = new Buffer(length);

  this._control(data, code, output, function (error, response) {
    if (error) {
      return callback(error);
    }

    callback(error, output.slice(0, response));
  });
};

CardReader.prototype.SCARD_CTL_CODE = function (code) {
  const isWin = /^win/.test(process.platform);

  if (isWin) {
    return (0x31 << 16) | (code << 2);
  } else {
    return 0x42000000 + code;
  }
};

// extend prototype
function inherits(target, source) {
  for (const key in source.prototype) {
    target.prototype[key] = source.prototype[key];
  }
}
