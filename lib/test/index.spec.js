const assert = require('assert');

const { describe, it } = require('mocha');
const sinon = require('sinon');

const pcsclite = require('../index.js');

const runner = (callback) => {
  try {
    console.log('instantiate pcsc');
    const pcsc = pcsclite();
    console.log('pcsc instantiated');

    console.log('pcsc', pcsc);

    const context = (done) => {
      console.log('context started', pcsc);
      callback(pcsc, done);
      console.log('context ended', pcsc);
    };

    const scope = async (close) => {
      console.log('scope started', pcsc);
      try {
        await new Promise(context);
      } finally {
        console.log('pcsc to close', pcsc);
        pcsc.close();
        console.log('pcsc closed', pcsc);
        close();
      }
      console.log('scope ended', pcsc);
    };

    return new Promise(scope);
  } catch (error) {
    console.log('error while running', error);
  }
};

describe('Testing PCSCLite private', () => {
  console.log('Testing PCSCLite private started');

  describe('#start()', () => {
    console.log('#start() started');

    it('stub', async () => {
      console.log('stub started');

      await runner((pcsc, done) => {
        console.log('runner started');

        sinon.stub(pcsc, 'start').callsFake((callback) => {
          console.log('stub called');

          const buffer = Buffer.from(
            'ACS ACR122U PICC Interface\u0000ACS ACR122U PICC Interface 01\u0000\u0000',
          );

          callback(undefined, buffer);

          console.log('stub ended');
        });

        let readerHit = 0;

        pcsc.on('reader', (reader) => {
          console.log('reader emitted');
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
          console.log('reader ended');
        });

        console.log('runner ended');
      });

      console.log('stub ended');
    });

    console.log('#start() ended');
  });

  console.log('Testing PCSCLite private ended');
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
