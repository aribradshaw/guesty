import { findScriptElement, injectScriptElement } from './utils';

describe('findScriptElement', () => {
  it('should return null if no script element is found', () => {
    const url = 'https://pay.guesty.com/tokenization/v1/init.js';
    const script = findScriptElement(url);

    expect(script).toBeNull();
  });

  it('should return the script element if it is found', () => {
    const url = 'https://pay.guesty.com/tokenization/v1/init.js';
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    document.head.appendChild(script);

    const foundScript = findScriptElement(url);

    expect(foundScript).toBe(script);
  });
});

describe('injectScriptElement', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('should inject a script element', () => {
    const url = 'https://pay.guesty.com/tokenization/v1/init.js';
    const onSuccess = jest.fn();
    const onError = jest.fn();

    injectScriptElement({ url, sandbox: false, onSuccess, onError });

    const script = document.head.querySelector('script');
    if (!script) {
      throw new Error('Script element not found');
    }

    expect(script).toBeInstanceOf(HTMLScriptElement);
    expect(script.src).toBe(url);
    expect(script.async).toBe(true);
    expect(script.getAttribute('data-env')).toBeNull();
    expect(script.onerror).toBe(onError);
    expect(script.onload).toBe(onSuccess);
  });

  it('should inject a script element with sandbox env attribute', () => {
    const url = 'https://pay.guesty.com/tokenization/v1/init.js';
    const onSuccess = jest.fn();
    const onError = jest.fn();

    injectScriptElement({ url, sandbox: true, onSuccess, onError });

    const script = document.head.querySelector('script');
    if (!script) {
      throw new Error('Script element not found');
    }

    expect(script).toBeInstanceOf(HTMLScriptElement);
    expect(script.src).toBe(url);
    expect(script.async).toBe(true);
    expect(script.getAttribute('data-env')).toBe('sandbox');
    expect(script.onerror).toBe(onError);
    expect(script.onload).toBe(onSuccess);
  });
});
