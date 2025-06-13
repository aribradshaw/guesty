import { loadScript } from './loadScript';
import * as utils from './utils';

const NAMESPACE = 'guestyTokenization';

describe('loadScript', () => {
  const injectScriptElementSpy = jest.spyOn(utils, 'injectScriptElement');
  const guestyTokenizationMock = {
    render: jest.fn(),
    destroy: jest.fn(),
    submit: jest.fn(),
    validate: jest.fn(),
  };

  beforeEach(() => {
    document.head.innerHTML = '';
  });

  afterEach(() => {
    injectScriptElementSpy.mockClear();
    delete window[NAMESPACE];
  });

  it('should return a promise', () => {
    expect(loadScript()).toBeInstanceOf(Promise);
  });

  it('should resolve with the global Guesty Tokenization object if it exists', async () => {
    document.head.innerHTML =
      '<script src="https://pay.guesty.com/tokenization/v1/init.js"></script>';
    window[NAMESPACE] = guestyTokenizationMock;

    const response = await loadScript();
    expect(injectScriptElementSpy).not.toHaveBeenCalled();
    expect(response).toEqual(guestyTokenizationMock);
  });

  it('should call injectScriptElement with the correct arguments if called without options', async () => {
    injectScriptElementSpy.mockImplementation(
      ({ onSuccess }: utils.InjectScriptElementOptions) => {
        window[NAMESPACE] = guestyTokenizationMock;

        process.nextTick(() => onSuccess());
      }
    );

    expect(window[NAMESPACE]).toBeUndefined();
    const response = await loadScript();
    expect(injectScriptElementSpy).toHaveBeenCalledWith({
      url: 'https://pay.guesty.com/tokenization/v1/init.js',
      sandbox: false,
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
    expect(response).toEqual(window[NAMESPACE]);
  });

  it('should call injectScriptElement with the correct arguments if called with options', async () => {
    injectScriptElementSpy.mockImplementation(
      ({ onSuccess }: utils.InjectScriptElementOptions) => {
        window[NAMESPACE] = guestyTokenizationMock;

        process.nextTick(() => onSuccess());
      }
    );

    expect(window[NAMESPACE]).toBeUndefined();
    const response = await loadScript({ sandbox: true });
    expect(injectScriptElementSpy).toHaveBeenLastCalledWith({
      url: 'https://pay.guesty.com/tokenization/v1/init.js',
      sandbox: true,
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
    expect(response).toEqual(window[NAMESPACE]);

    const response2 = await loadScript({ version: 'v1' });
    expect(injectScriptElementSpy).toHaveBeenLastCalledWith({
      url: 'https://pay.guesty.com/tokenization/v1/init.js',
      sandbox: false,
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
    expect(response2).toEqual(window[NAMESPACE]);

    const response3 = await loadScript({ version: 'v2' });
    expect(injectScriptElementSpy).toHaveBeenLastCalledWith({
      url: 'https://pay.guesty.com/tokenization/v2/init.js',
      sandbox: false,
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
    expect(response3).toEqual(window[NAMESPACE]);
  });

  it('should reject if the script fails to load', async () => {
    injectScriptElementSpy.mockImplementation(
      ({ onError }: utils.InjectScriptElementOptions) => {
        process.nextTick(() => onError());
      }
    );

    expect(window[NAMESPACE]).toBeUndefined();
    await expect(loadScript()).rejects.toEqual(
      new Error(
        'The script https://pay.guesty.com/tokenization/v1/init.js failed to load'
      )
    );
    expect(window[NAMESPACE]).toBeUndefined();
  });

  it('should reject if the script loaded but no guestyTokenization added on window', async () => {
    injectScriptElementSpy.mockImplementation(
      ({ onSuccess }: utils.InjectScriptElementOptions) => {
        process.nextTick(() => onSuccess());
      }
    );

    expect(window[NAMESPACE]).toBeUndefined();
    await expect(loadScript()).rejects.toEqual(
      new Error('Guesty Tokenization is not available')
    );
  });
});
