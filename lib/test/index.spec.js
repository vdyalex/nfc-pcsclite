import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, spy as _spy } from 'sinon';

import pcsclite from '../index.js';

describe('Testing PCSCLite private', () => {
  describe('#start()', () => {
    it('stub', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          const buffer = Buffer.from(
            'ACS ACR122U PICC Interface\u0000ACS ACR122U PICC Interface 01\u0000\u0000',
          );

          callback(undefined, buffer);
        });

        let readerHit = 0;

        pcsc.on('reader', (reader) => {
          reader.close();

          switch (++readerHit) {
            case 1:
              expect(reader.name).to.equal('ACS ACR122U PICC Interface');
              break;
            case 2:
              expect(reader.name).to.equal('ACS ACR122U PICC Interface 01');
              done();
              break;
          }
        });
      } finally {
        pcsc.close();
      }
    });
  });
});

describe('Testing CardReader private', () => {
  describe('#_connect()', () => {
    it('success', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          stub(reader, '_connect').callsFake(
            (_share_mode, _protocol, callback) => {
              callback(undefined, 1);
            },
          );

          reader.connect((error, protocol) => {
            expect(error).to.not.exist;
            expect(protocol).to.equal(1);
            done();
          });
        });
      } finally {
        pcsc.close();
      }
    });

    it('error', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          const spy = _spy();

          stub(reader, '_connect').callsFake(
            (_share_mode, _protocol, callback) => {
              callback('');
            },
          );

          reader.connect(spy);
          expect(spy.calledOnce).to.be.true;
          done();
        });
      } finally {
        pcsc.close();
      }
    });

    it('already connected', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          const spy = _spy();
          reader.connected = true;

          reader.connect(spy);
          process.nextTick(() => {
            expect(spy.calledOnce).to.be.true;
            done();
          });
        });
      } finally {
        pcsc.close();
      }
    });
  });

  describe('#_disconnect()', () => {
    it('success', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          reader.connected = true;
          const spy = _spy();

          stub(reader, '_disconnect').callsFake((_disposition, callback) => {
            callback(undefined);
          });

          reader.disconnect(spy);
          expect(spy.calledOnce).to.be.true;
          done();
        });
      } finally {
        pcsc.close();
      }
    });

    it('error', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          reader.connected = true;
          const spy = _spy();

          stub(reader, '_disconnect').callsFake((_disposition, callback) => {
            callback('');
          });

          reader.disconnect(spy);
          expect(spy.calledOnce).to.be.true;
          done();
        });
      } finally {
        pcsc.close();
      }
    });

    it('already disconnected', (done) => {
      const pcsc = pcsclite();

      try {
        stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          const spy = _spy();

          stub(reader, '_disconnect').callsFake((_disposition, callback) => {
            callback(undefined);
          });

          reader.disconnect(spy);

          process.nextTick(() => {
            expect(spy.calledOnce).to.be.true;
            done();
          });
        });
      } finally {
        pcsc.close();
      }
    });
  });
});
