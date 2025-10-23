# **nfc-pcsclite**

[![npm](https://img.shields.io/npm/v/nfc-pcsclite.svg)](https://www.npmjs.com/package/nfc-pcsclite)
[![CI](https://github.com/vdyalex/nfc-pcsclite/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/vdyalex/nfc-pcsclite/actions/workflows/continuous-integration.yml)
![GitHub contributors](https://img.shields.io/github/contributors/vdyalex/nfc-pcsclite)
![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/vdyalex/nfc-pcsclite)
![GitHub License](https://img.shields.io/github/license/vdyalex/nfc-pcsclite)

> **Cross-platform NFC library for Node.js**
> Read and write NFC tags and smart cards using built-in **PC/SC bindings**.
> Works on **Linux**, **macOS**, and **Windows**.

---

## Content

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Installation](#installation)
  - [Requirements](#requirements)
    - [Node.js](#nodejs)
    - [Build tools](#build-tools)
    - [PC/SC API](#pcsc-api)
    - [Install package](#install-package)
- [NFC Tag Handling Flow](#nfc-tag-handling-flow)
- [Basic Usage](#basic-usage)
- [Alternative Usage (Manual Processing)](#alternative-usage-manual-processing)
- [Reading & Writing Data](#reading--writing-data)
- [FAQ](#faq)
  - [Can I use it in Electron?](#can-i-use-it-in-electron)
  - [Can I use it in Angular + Electron?](#can-i-use-it-in-angular--electron)
  - [Do I need Babel?](#do-i-need-babel)
  - [Supported Node.js versions](#supported-nodejs-versions)
  - [Can I read NDEF tags?](#can-i-read-ndef-tags)
  - [React Native support?](#react-native-support)
- [Common Issues](#common-issues)
  - [Transaction failed using `CONNECT_MODE_DIRECT`](#transaction-failed-using-connect_mode_direct)
  - [Authentication Error after Multiple Writes (MIFARE Classic)](#authentication-error-after-multiple-writes-mifare-classic)
  - [Reading Type 4 tags (Elsys sensors)](#reading-type-4-tags-elsys-sensors)
- [Disclaimer](#disclaimer)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

`nfc-pcsclite` provides a low-level Node.js interface for NFC operations using PC/SC bindings.
It supports automatic card detection, UID reading, and communication with **Android HCE** devices.

✅ Supports **card UID auto-reading**

✅ Works with **ACR122 USB reader** and other **PC/SC-compliant devices**

✅ Includes **native pcsclite bindings**

> ⚠️ If card detection fails, check the [Alternative Usage](#alternative-usage-manual-processing) section.

---

## Installation

### Requirements

#### Node.js

Compatible with **Node.js 18 or newer**.

#### Build tools

This package includes native bindings built with **node-gyp**.
Ensure you have a **C/C++ toolchain** installed for your OS.
See [node-gyp Installation Guide](https://github.com/nodejs/node-gyp#installation).

#### PC/SC API

- **macOS / Windows**: Already included.

- **Linux / UNIX**: Install manually:

```bash
apt-get install libpcsclite1 libpcsclite-dev pcscd
```

#### Install package

```bash
# Using npm
npm install nfc-pcsclite

# Using Yarn
yarn add nfc-pcsclite
```

---

## NFC Tag Handling Flow

When a tag is detected, the following occurs:

1. Detects the card standard (`TAG_ISO_14443_3` or `TAG_ISO_14443_4`);
2. Connects to the card;
3. Depending on `autoProcessing`:
   - `true` (default): automatically retrieves UID or APDU data; or
   - `false`: triggers `card` event only, letting you handle transmission manually;
4. You can then read, write, or send custom commands.

---

## Basic Usage

```js
import { NFC } from 'nfc-pcsc';

const nfc = new NFC(); // optional: pass a logger (e.g. Pino, Winston)

nfc.on('reader', reader => {
  console.log(`${reader.reader.name} device attached`);

  reader.on('card', card => {
    console.log(`${reader.reader.name} card detected`, card);
  });

  reader.on('card.off', card => {
    console.log(`${reader.reader.name} card removed`, card);
  });

  reader.on('error', err => {
    console.error(`${reader.reader.name} error`, err);
  });

  reader.on('end', () => {
    console.log(`${reader.reader.name} device removed`);
  });
});

nfc.on('error', err => {
  console.error('An error occurred', err);
});
```

---

## Alternative Usage (Manual Processing)

```js
import { NFC } from 'nfc-pcsc';

const nfc = new NFC();

nfc.on('reader', reader => {
  reader.autoProcessing = false;

  console.log(`${reader.reader.name} device attached`);

  reader.on('card', card => {
    console.log(`${reader.reader.name} card inserted`, card);

    // Send custom APDU commands using reader.transmit()
  });
});
```

---

## Reading & Writing Data

Example with MIFARE Ultralight tag:

```js
reader.on('card', async card => {
  try {
    const data = await reader.read(4, 12);
    console.log('Data read:', data.toString());
  } catch (err) {
    console.error('Error reading data', err);
  }

  try {
    const text = 'Bright minds build code';
    const buffer = Buffer.alloc(12, 0);
    buffer.write(text);
    await reader.write(4, buffer);
    console.log('Data written');
  } catch (err) {
    console.error('Error writing data', err);
  }
});
```

---

## FAQ

### Can I use it in Electron?

Yes. It works with Electron and other Node.js environments that support native modules.

See [Electron’s guide on native modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules).

### Can I use it in Angular + Electron?

Yes. You’ll need to update your `package.json` and `webpack.config.js` per [this issue comment](https://github.com/pokusew/nfc-pcsc/issues/24#issuecomment-327038188).

### Do I need Babel?

No. The library is already transpiled to support Node.js 18+.

### Supported Node.js versions

`18.x`, `20.x`, `22.x`

### Can I read NDEF tags?

Yes. Use `reader.read()` and parse the raw bytes with [TapTrack/NdefJS](https://github.com/TapTrack/NdefJS).

### React Native support?

No. `nfc-pcsclite` depends on Node.js native bindings and PC/SC APIs, unavailable in mobile runtimes.

---

## Common Issues

### Transaction failed using `CONNECT_MODE_DIRECT`

See [explanation](https://github.com/pokusew/nfc-pcsc/issues/13#issuecomment-302482621).

### Authentication Error after Multiple Writes (MIFARE Classic)

See [instructions](https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178).

### Reading Type 4 tags (Elsys sensors)

Set `readClass` to `0x00` in:

```js
reader.read(blockNumber, length, blockSize, packetSize, 0x00);
```

See [discussion](https://github.com/pokusew/nfc-pcsc/pull/55#issuecomment-450120232).

---

## Disclaimer

This library revives maintenance over an abandoned project. For a high-level API, see [nfc-pcsc](https://github.com/pokusew/nfc-pcsc).

---

## License

Released under the [MIT License](./LICENSE.md).
