export const findScriptElement = (url: string) => {
  return document.querySelector(`script[src="${url}"]`);
};

export interface InjectScriptElementOptions {
  url: string;
  sandbox: boolean;
  onSuccess: () => void;
  onError: () => void;
}

export const injectScriptElement = ({
  url,
  sandbox,
  onSuccess,
  onError,
}: InjectScriptElementOptions) => {
  const script = document.createElement('script');
  script.src = url;
  script.async = true;
  script.onerror = onError;
  script.onload = onSuccess;

  if (sandbox) {
    script.setAttribute('data-env', 'sandbox');
  }

  document.head.insertBefore(script, document.head.firstElementChild);
};
