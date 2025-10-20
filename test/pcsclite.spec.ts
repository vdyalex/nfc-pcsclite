import mock from 'mock-require';
import { expect } from 'chai';

// mock pcsclite to allow to simulate cards
import pcscliteMock from './mock/pcsclite';

mock('pcsclite', pcscliteMock);

const NFC = require('../src/NFC').default;

describe('Smoke', () => {
  it('should properly instantiate the NFC class', () => {
    const nfc = new NFC();

    expect(nfc).to.instanceOf(NFC);
  });
});
