import sinon from 'sinon';
import mock from 'mock-require';

import pcsclite, { mocked } from './mock/pcsclite';
import assert from 'assert';

mock('lib:pcsclite', pcsclite);

const NFC = require('../NFC').default;

describe('Smoke', () => {
  const logger = {
    debug: sinon.spy(),
    error: sinon.spy(),
  };

  beforeEach(() => {
    mocked.on.resetHistory();
  });

  it('should properly instantiate the NFC class', () => {
    const nfc = new NFC(logger);

    assert.ok(nfc instanceof NFC);
    assert.equal(mocked.on.callCount, 2);
  });

  it('should initialize pcsclite and set up event listeners', () => {
    const nfc = new NFC(logger);

    assert.ok(mocked.on.calledWith('reader'));
    assert.ok(mocked.on.calledWith('error'));
    assert.equal(mocked.on.callCount, 2);

    // check instance type
    assert.ok(nfc instanceof NFC);
  });

  it('should gracefully fail when invoking close', () => {
    const nfc = new NFC();

    try {
      nfc.close();
      assert.equal(mocked.close.calledOnce, true);
    } catch (error) {
      assert.fail('close threw an unexpected error');
    }
  });
});
