import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { config } from "../../general/config";

let cachedRootCertificates: Buffer[] | undefined;

const loadAppleRootCertificates = (): Buffer[] => {
  if (cachedRootCertificates) {
    return cachedRootCertificates;
  }

  cachedRootCertificates = config.apple.iap.rootCerts.map((cert) =>
    Buffer.from(cert, "base64"),
  );

  return cachedRootCertificates;
};

const appAppleId = config.apple.iap.appAppleId
  ? parseInt(config.apple.iap.appAppleId, 10)
  : undefined;

const verifierCache: Partial<Record<Environment, SignedDataVerifier>> = {};

const getVerifier = (environment: Environment): SignedDataVerifier => {
  const existing = verifierCache[environment];
  if (existing) {
    return existing;
  }

  const verifier = new SignedDataVerifier(
    loadAppleRootCertificates(),
    true,
    environment,
    config.apple.iap.bundleId,
    environment === Environment.PRODUCTION ? appAppleId : undefined,
  );

  verifierCache[environment] = verifier;

  return verifier;
};

const verifyAppleTestTransaction = async (signedTransactionInfo: string) => {
  try {
    return await getVerifier(Environment.XCODE).verifyAndDecodeTransaction(
      signedTransactionInfo,
    );
  } catch {
    return await getVerifier(
      Environment.LOCAL_TESTING,
    ).verifyAndDecodeTransaction(signedTransactionInfo);
  }
};

export const verifyAppleTransaction = async (
  signedTransactionInfo: string,
): Promise<JWSTransactionDecodedPayload> => {
  try {
    return await getVerifier(Environment.PRODUCTION).verifyAndDecodeTransaction(
      signedTransactionInfo,
    );
  } catch (productionError) {
    try {
      return await getVerifier(Environment.SANDBOX).verifyAndDecodeTransaction(
        signedTransactionInfo,
      );
    } catch {
      if ((process.env.NODE_ENV || "production") !== "production") {
        return await verifyAppleTestTransaction(signedTransactionInfo);
      }
      throw productionError;
    }
  }
};

export const verifyAppleNotification = async (
  signedPayload: string,
): Promise<ResponseBodyV2DecodedPayload> => {
  try {
    return await getVerifier(
      Environment.PRODUCTION,
    ).verifyAndDecodeNotification(signedPayload);
  } catch {
    return await getVerifier(Environment.SANDBOX).verifyAndDecodeNotification(
      signedPayload,
    );
  }
};

const apiClientCache: Partial<Record<Environment, AppStoreServerAPIClient>> =
  {};

const getApiClient = (environment: Environment): AppStoreServerAPIClient => {
  const existing = apiClientCache[environment];
  if (existing) {
    return existing;
  }

  const client = new AppStoreServerAPIClient(
    config.apple.iap.privateKey,
    config.apple.iap.keyId,
    config.apple.iap.issuerId,
    config.apple.iap.bundleId,
    environment,
  );

  apiClientCache[environment] = client;

  return client;
};

const fetchAppleTransaction = async (
  environment: Environment,
  transactionId: string,
): Promise<JWSTransactionDecodedPayload> => {
  const response =
    await getApiClient(environment).getTransactionInfo(transactionId);
  if (!response.signedTransactionInfo) {
    throw new Error("Apple transaction info response missing signed data");
  }
  return await verifyAppleTransaction(response.signedTransactionInfo);
};

export const getAppleTransactionById = async (
  transactionId: string,
): Promise<JWSTransactionDecodedPayload> => {
  try {
    return await fetchAppleTransaction(Environment.PRODUCTION, transactionId);
  } catch (prodErr) {
    try {
      return await fetchAppleTransaction(Environment.SANDBOX, transactionId);
    } catch {
      throw prodErr;
    }
  }
};
