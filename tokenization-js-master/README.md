# [Guesty Tokenization JS SDK](https://github.com/guestyorg/tokenization-js/wiki)

There are two ways to integrate the SDK:

### Manually include a script tag

Add a script tag to your application `head` or `body`.
This loads `guestyTokenization` object to the global `window` scope of the browser

```html
<script src="https://pay.guesty.com/tokenization/v1/init.js"></script>
```

### Use it as an ES module

Advantages of loading the SDK as a module:

- loads script asynchronously to ensure page rendering isn't blocked
- returns a Promise to know when script loading is complete
- resolves to `null` if called in a server environment

#### Note: To be PCI-compliant, you must load the SDK directly from https://pay.guesty.com (either by adding a script tag or using the ES module). You cannot include it in a bundle or host it yourself.

## Installation

Use `npm` to install the Guesty Tokenization JS module:

```sh
npm install @guestyorg/tokenization-js
```

## Usage

Import the `loadScript` function for asynchronously loading the Guesty Tokenization JS SDK

### loadScript(options?)

- accepts an `options` object to configure script URL and attributes
- returns a Promise that resolves with `window.guestyTokenization` after the SDK is finished loading

#### options

- `sandbox` - load the SDK in a sandbox mode
- `version` - SDK version to load (default: `v1`)

```js
loadScript({ sandbox: true });
```

This is equivalent to the following script:

```html
<script
  src="https://pay.guesty.com/tokenization/v1/init.js"
  data-env="sandbox"
></script>
```

#### Async/Await

```js
import { loadScript } from '@guestyorg/tokenization-js';

try {
  const guestyTokenization = await loadScript();
  // Guesty Tokenization JS SDK is loaded and ready to use
} catch (error) {
  console.error('Failed to load the Guesty Tokenization JS SDK script', error);
}
```

#### Promises

```js
import { loadScript } from '@guestyorg/tokenization-js';

loadScript()
  .then((guestyTokenization) => {
    // Guesty Tokenization JS SDK is loaded and ready to use
  })
  .catch((error) => {
    console.error(
      'Failed to load the Guesty Tokenization JS SDK script',
      error
    );
  });
```

## TypeScript Support

This package includes TypeScript type definitions for the Guesty Tokenization JS SDK. This includes types for the `window.guestyTokenization` namespace. We support projects using TypeScript versions >= 3.8.
