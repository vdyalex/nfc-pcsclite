import mock from 'mock-require';

// mock pcsclite to allow to simulate cards
import pcscliteMock from './mock/pcsclite';
import assert from 'assert';

mock('pcsclite', pcscliteMock);

const NFC = require('../src/NFC').default;

describe('Smoke', () => {
  it('should properly instantiate the NFC class', () => {
    const nfc = new NFC();

    assert.ok(nfc instanceof NFC);
  });
});
