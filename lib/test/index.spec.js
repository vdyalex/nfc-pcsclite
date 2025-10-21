const assert = require('assert');

const { describe, it } = require('mocha');
const sinon = require('sinon');

const pcsclite = require('../index.js');

const runner = (callback) => {
  const pcsc = pcsclite();

  const context = (done) => callback(pcsc, done);

  const scope = async (close) => {
    try {
      await new Promise(context);
    } finally {
      pcsc.close();
      close();
    }
  };

  return new Promise(scope);
};

describe('Testing PCSCLite private', () => {
  describe('#start()', () => {
    it('stub', async () => {
      await runner((pcsc, done) => {
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
              assert.equal(reader.name, 'ACS ACR122U PICC Interface');
              break;
            case 2:
              assert.equal(reader.name, 'ACS ACR122U PICC Interface 01');
              done();
              break;
          }
        });
      });
    });
  });
});

describe('Testing CardReader private', () => {
  describe('#_connect()', () => {
    it('success', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          sinon
            .stub(reader, '_connect')
            .callsFake((_share_mode, _protocol, callback) => {
              callback(undefined, 1);
            });

          reader.connect((error, protocol) => {
            assert.ok(!error);
            assert.equal(protocol, 1);
            done();
          });
        });
      });
    });

    it('error', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          const spy = sinon.spy();

          sinon
            .stub(reader, '_connect')
            .callsFake((_share_mode, _protocol, callback) => {
              callback('');
            });

          reader.connect(spy);
          assert(spy.calledOnce, true);
          done();
        });
      });
    });

    it('already connected', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          const spy = sinon.spy();
          reader.connected = true;

          reader.connect(spy);
          process.nextTick(() => {
            assert.equal(spy.calledOnce, true);
            done();
          });
        });
      });
    });
  });

  describe('#_disconnect()', () => {
    it('success', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          reader.connected = true;
          const spy = sinon.spy();

          sinon
            .stub(reader, '_disconnect')
            .callsFake((_disposition, callback) => {
              callback(undefined);
            });

          reader.disconnect(spy);
          assert.equal(spy.calledOnce, true);
          done();
        });
      });
    });

    it('error', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          reader.connected = true;
          const spy = sinon.spy();

          sinon
            .stub(reader, '_disconnect')
            .callsFake((_disposition, callback) => {
              callback('');
            });

          reader.disconnect(spy);
          assert.equal(spy.calledOnce, true);
          done();
        });
      });
    });

    it('already disconnected', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          /* "MyReader\0" */
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          const spy = sinon.spy();

          sinon
            .stub(reader, '_disconnect')
            .callsFake((_disposition, callback) => {
              callback(undefined);
            });

          reader.disconnect(spy);

          process.nextTick(() => {
            assert.equal(spy.calledOnce, true);
            done();
          });
        });
      });
    });
  });
});
