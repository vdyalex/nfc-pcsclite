import sinon from 'sinon';

export const mocked = {
  on: sinon.spy(),
  readers: {},
  close: sinon.spy(),
};

export default function () {
  return mocked;
}
