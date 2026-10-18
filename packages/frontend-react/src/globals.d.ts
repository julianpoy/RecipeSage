interface GoogleCredentialResponse {
  credential: string;
  clientId?: string;
}

interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    context: string;
    ux_mode: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_prompt: string;
  }): void;
  prompt(): void;
  renderButton(container: HTMLElement, options: Record<string, string>): void;
}

interface AppleSignInResponse {
  authorization?: {
    id_token?: string;
    code?: string;
  };
  user?: {
    name?: { firstName?: string; lastName?: string };
  };
}

interface AppleIDAuth {
  init(options: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
  }): void;
  signIn(): Promise<AppleSignInResponse | undefined>;
}

interface Window {
  version: string;
  currentRSLanguage?: string;
  appLoaded?: boolean;
  swRegistration?: ServiceWorkerRegistration;
  onSWRegistration?: () => void;
  google?: {
    accounts?: {
      id: GoogleAccountsId;
    };
  };
  AppleID?: {
    auth: AppleIDAuth;
  };
}
