export interface GuestyTokenizationStyles {
  mobileBreakpoint?: number;
  fontFamily?: string;
  fontSizeMd?: number;
  fontSizeLg?: number;
  fontWeightRegular?: number;
  fontWeightBold?: number;
  colorText?: string;
  colorTextError?: string;
  colorBorder?: string;
  colorBorderError?: string;
  colorBorderHover?: string;
  colorPlaceholder?: string;
  colorBackground?: string;
  colorFormBackground?: string;
  colorBackgroundError?: string;
  colorBackgroundDisabled?: string;
  inputHeight?: number;
  inputPadding?: number;
  borderRadius?: number;
}

type Section = 'cardholderName' | 'paymentDetails' | 'billingAddress';
type TCardholderNameInput = 'firstName' | 'lastName' | 'cardHolderId';
type TBillingAddressInput = 'street' | 'city' | 'state' | 'zipCode' | 'country';
type TPaymentDetailsInput = 'cardNumber' | 'expirationDate' | 'csc';

type TInput =
  | TCardholderNameInput
  | TBillingAddressInput
  | TPaymentDetailsInput;

export interface GuestyTokenizationV1RenderOptions {
  containerId: string;
  providerId: string;
  amount: number;
  currency: string;
  onStatusChange?: (status: boolean) => void;
  styles?: GuestyTokenizationStyles;
  lang?: string;
  initialValues?: {
    [key in Exclude<TInput, 'cardHolderId' | TPaymentDetailsInput>]?: string;
  };
  showInitialValuesToggle?: boolean;
  initialValuesToggleLabel?: string;
  sections?: Section[];
  showSupportedCards?: boolean;
  showPciCompliantLink?: boolean;
  inputsConfig?: {
    [key in TInput]?: {
      label?: string;
      placeholder?: string;
    };
  };
}

export interface GuestyTokenizationV2RenderOptions {
  containerId: string;
  providerId: string;
  onStatusChange?: (status: boolean) => void;
  styles?: GuestyTokenizationStyles;
  lang?: string;
  initialValues?: {
    firstName?: string;
    lastName?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  showInitialValuesToggle?: boolean;
  initialValuesToggleLabel?: string;
  sections?: Section[];
  showSupportedCards?: boolean;
  showPciCompliantLink?: boolean;
}

export interface GuestyTokenizationV2ApiV2SubmitPayload {
  amount: number;
  currency: string;
  apiVersion: 'v2';
}

type ReservationOrQuote =
  | {
      reservationId: string;
      quoteId?: never;
      guest?: never;
    }
  | {
      quoteId: string;
      guest: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
      };
      reservationId?: never;
    };

export type GuestyTokenizationV2ApiV3SubmitPayload = {
  listingId: string;
  amount: number;
  currency: string;
  apiVersion?: 'v3';
} & ReservationOrQuote;

export type GuestyTokenizationV2SubmitPayload =
  | GuestyTokenizationV2ApiV2SubmitPayload
  | GuestyTokenizationV2ApiV3SubmitPayload;

export interface PaymentMethod {
  _id: string;
}

export interface GuestyTokenizationV1Namespace {
  render: (options: GuestyTokenizationV1RenderOptions) => Promise<void>;
  destroy: () => Promise<void>;
  submit: () => Promise<PaymentMethod>;
  validate: () => void;
}

export interface GuestyTokenizationV2Namespace {
  render: (options: GuestyTokenizationV2RenderOptions) => Promise<void>;
  destroy: () => Promise<void>;
  submit: (
    payload: GuestyTokenizationV2SubmitPayload
  ) => Promise<PaymentMethod>;
  validate: () => void;
}

export interface LoadScriptOptions {
  sandbox?: boolean;
  version?: 'v1' | 'v2';
}

type NamespaceBasedOnVersion<T extends LoadScriptOptions['version']> =
  T extends 'v1'
    ? GuestyTokenizationV1Namespace
    : T extends 'v2'
    ? GuestyTokenizationV2Namespace
    : never;

export function loadScript<T extends LoadScriptOptions['version']>(
  options?: LoadScriptOptions & { version: T }
): Promise<NamespaceBasedOnVersion<T> | null>;

declare global {
  interface Window {
    guestyTokenization?:
      | GuestyTokenizationV1Namespace
      | GuestyTokenizationV2Namespace
      | null;
  }
}
