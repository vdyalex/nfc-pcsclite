const { describe, it } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');

const pcsclite = require('../index.js');

describe('Testing PCSCLite private', () => {
  describe('#start()', () => {
    it('#start() stub', (done) => {
      const pcsc = pcsclite();

      try {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
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
  const get_reader = () => {
    const pcsc = pcsclite();

    sinon.stub(pcsc, 'start').callsFake((callback) => {
      /* "MyReader\0" */
      const buffer = Buffer.from('MyReader\u0000\u0000');
      callback(undefined, buffer);
    });

    return pcsc;
  };

  describe('#_connect()', () => {
    it('#_connect() success', (done) => {
      const pcsc = get_reader();

      pcsc.on('reader', (reader) => {
        sinon
          .stub(reader, '_connect')
          .callsFake((_share_mode, _protocol, callback) => {
            callback(undefined, 1);
          });

        reader.connect((error, protocol) => {
          expect(error).to.not.exist;
          expect(protocol).to.equal(1);
          done();
        });
      });
    });

    it('#_connect() error', (done) => {
      const pcsc = get_reader();

      pcsc.on('reader', (reader) => {
        const spy = sinon.spy();

        sinon
          .stub(reader, '_connect')
          .callsFake((_share_mode, _protocol, callback) => {
            callback('');
          });

        reader.connect(spy);
        expect(spy.calledOnce).to.be.true;
        done();
      });
    });

    it('#_connect() already connected', (done) => {
      const pcsc = get_reader();

      pcsc.on('reader', (reader) => {
        const spy = sinon.spy();
        reader.connected = true;

        reader.connect(spy);
        process.nextTick(() => {
          expect(spy.calledOnce).to.be.true;
          done();
        });
      });
    });
  });

  describe('#_disconnect()', () => {
    it('#_disconnect() success', (done) => {
      const pcsc = get_reader();

      pcsc.on('reader', (reader) => {
        reader.connected = true;
        const spy = sinon.spy();

        sinon
          .stub(reader, '_disconnect')
          .callsFake((_disposition, callback) => {
            callback(undefined);
          });

        reader.disconnect(spy);
        expect(spy.calledOnce).to.be.true;
        done();
      });
    });

    it('#_disconnect() error', (done) => {
      const pcsc = get_reader();

      pcsc.on('reader', (reader) => {
        reader.connected = true;
        const spy = sinon.spy();

        sinon
          .stub(reader, '_disconnect')
          .callsFake((_disposition, callback) => {
            callback('');
          });

        reader.disconnect(spy);
        expect(spy.calledOnce).to.be.true;
        done();
      });
    });

    it('#_disconnect() already disconnected', (done) => {
      const pcsc = get_reader();

      pcsc.on('reader', (reader) => {
        const spy = sinon.spy();

        sinon
          .stub(reader, '_disconnect')
          .callsFake((_disposition, callback) => {
            callback(undefined);
          });

        reader.disconnect(spy);

        process.nextTick(() => {
          expect(spy.calledOnce).to.be.true;
          done();
        });
      });
    });
  });
});
