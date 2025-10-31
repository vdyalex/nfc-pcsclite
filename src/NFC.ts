import EventEmitter from 'node:events';
import pcsclite, { CardReader, PCSCLite } from 'lib:pcsclite';

import Reader from './reader/Reader';
import ACR122Reader from './reader/ACR122Reader';

import { DEVICE_ACR1252U, DEVICE_ARC122U } from './utils/device';
import { defaultLogger, Logger } from './utils/logger';

class NFC extends EventEmitter {
  pcsc: PCSCLite | null = null;
  logger: Logger = defaultLogger;

  constructor(logger?: Logger) {
    super();

    this.pcsc = pcsclite();

    if (logger) {
      this.logger = logger;
    }

    this.pcsc.on('reader', (_reader) => {
      this.logger.debug('new reader detected', _reader.name);

      const name = _reader.name.toLowerCase();
      // Create special object for ARC122U reader with commands specific to this reader
      const devices = [DEVICE_ARC122U, DEVICE_ACR1252U];
      const isACR122 = devices
        // Converts all models to regular expression with case insensitive
        .map((device) => new RegExp(device, 'gi'))
        // Checks if at least one model is matching the device name
        .some((regex) => regex.test(name));

      const reader = isACR122
        ? new ACR122Reader(_reader, this.logger)
        : new Reader(_reader, this.logger);

      this.emit('reader', reader);
    });

    this.pcsc.on('error', (err) => {
      this.logger.error('PCSC error', err.message);

      this.emit('error', err);
    });
  }

  get readers(): Record<string, CardReader> {
    if (!this.pcsc) {
      return {};
    }

    return this.pcsc.readers;
  }

  close() {
    if (this.pcsc) {
      this.removeAllListeners();
      this.pcsc.close();
    }
  }
}

export default NFC;
