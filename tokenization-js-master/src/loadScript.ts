import { findScriptElement, injectScriptElement } from './utils';
import { NAMESPACE } from './constants';
import { LoadScriptOptions } from '../types';

export const loadScript = (options: LoadScriptOptions = {}) => {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  const version = options.version ?? 'v1';
  const scriptUrl = `https://pay.guesty.com/tokenization/${version}/init.js`;

  const existingScript = findScriptElement(scriptUrl);
  const existingNamespace = window[NAMESPACE];
  if (existingScript) {
    if (existingNamespace) {
      return Promise.resolve(existingNamespace);
    }
    existingScript.remove();
  }

  return new Promise((resolve, reject) => {
    injectScriptElement({
      url: scriptUrl,
      sandbox: options.sandbox ?? false,
      onSuccess: () => {
        const newNamespace = window[NAMESPACE];

        if (newNamespace) {
          resolve(newNamespace);
        } else {
          reject(new Error('Guesty Tokenization is not available'));
        }
      },
      onError: () => {
        reject(new Error(`The script ${scriptUrl} failed to load`));
      },
    });
  });
};
