const assert = require('assert');

const { describe, it } = require('mocha');
const sinon = require('sinon');

const pcsclite = require('../pcsclite.js');

const runner = (callback) => {
  const pcsc = pcsclite();

  const context = (done) => {
    callback(pcsc, done);
  };

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
    it('should stub the start method and handle multiple readers', async () => {
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

    it('should allow calling start, close, and start again successfully', async () => {
      await runner(async (pcsc, done) => {
        let isFirstDone = false;
        let isSecondDone = false;

        sinon.stub(pcsc, 'start').callsFake((callback) => {
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.on('reader', (reader) => {
          if (!isFirstDone) {
            isFirstDone = true;
            reader.close();
            pcsc.close();

            pcsc.start(() => {
              isSecondDone = true;
              reader.close();

              assert.strictEqual(isFirstDone, true);
              assert.strictEqual(isSecondDone, true);
              done();
            });
          }
        });
      });
    });

    it('should close gracefully even if start was never called', async () => {
      await runner((pcsc, done) => {
        const spy = sinon.spy(pcsc, 'close');
        try {
          pcsc.close();
          assert.equal(spy.calledOnce, true);
          done();
        } catch (error) {
          assert.fail('close threw an unexpected error');
        }
      });
    });

    it('should prevent multiple concurrent calls to start', async () => {
      await runner((pcsc, done) => {
        sinon.stub(pcsc, 'start').callsFake((callback) => {
          const buffer = Buffer.from('MyReader\u0000\u0000');
          callback(undefined, buffer);
        });

        pcsc.start(() => {
          try {
            // second call should be rejected
            assert.throws(() => pcsc.start(() => {}), /already started/i);
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });
  });
});

describe('Testing CardReader private', () => {
  describe('#_connect()', () => {
    it('should connect to reader successfully', async () => {
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

    it('should handle error when connecting to reader', async () => {
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

    it('should detect and handle already connected reader', async () => {
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
    it('should disconnect from reader successfully', async () => {
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

    it('should handle error when disconnecting from reader', async () => {
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

    it('should identify when already disconnected', async () => {
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
