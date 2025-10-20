import EventEmitter from 'events';

// TODO
class MockPCSC extends EventEmitter {
  constructor() {
    super();
  }

  simulateReader(reader: MockReader) {
    this.emit('reader', reader);
  }
}

class MockReader extends EventEmitter {
  constructor(public name: string = 'MockReader') {
    super();
  }

  simulateCard(card: MockCard) {
    this.emit('card', card);
  }
}

class MockCard extends EventEmitter {
  constructor() {
    super();
  }
}

export default function () {
  return new MockPCSC();
}
