import { Injectable, inject } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import {
  NativePurchases,
  PURCHASE_TYPE,
  type Product,
  type Transaction,
} from "@capgo/native-purchases";

import { ServerActionsService } from "./server-actions.service";
import { CapabilitiesService } from "./capabilities.service";
import { appIdbStorageManager } from "../utils/appIdbStorageManager";

export type IapPlatform = "apple" | "google";

export interface IapOfferings {
  monthly: Product[];
  yearly: Product[];
}

@Injectable({
  providedIn: "root",
})
export class IapService {
  private serverActionsService = inject(ServerActionsService);
  private capabilitiesService = inject(CapabilitiesService);

  getPlatform(): IapPlatform | undefined {
    if (!Capacitor.isNativePlatform()) return undefined;

    const platform = Capacitor.getPlatform();
    if (platform === "ios") return "apple";
    if (platform === "android") return "google";
    return undefined;
  }

  async getOfferings(): Promise<IapOfferings | undefined> {
    const platform = this.getPlatform();
    if (!platform) return undefined;

    const products = await this.serverActionsService.iap.getIapProducts({
      platform,
    });
    if (!products) return undefined;

    const fetched = this.dedupeToBaseOffers(
      await this.getProducts(products.productIds),
      platform,
    );
    const monthlyIds = new Set(products.monthly);
    const yearlyIds = new Set(products.yearly);

    return {
      monthly: fetched.filter((product) => monthlyIds.has(product.identifier)),
      yearly: fetched.filter((product) => yearlyIds.has(product.identifier)),
    };
  }

  private async getProducts(productIdentifiers: string[]): Promise<Product[]> {
    if (productIdentifiers.length === 0) return [];

    const { products } = await NativePurchases.getProducts({
      productIdentifiers,
      productType: PURCHASE_TYPE.SUBS,
    });

    return products;
  }

  private dedupeToBaseOffers(
    products: Product[],
    platform: IapPlatform,
  ): Product[] {
    if (platform !== "google") return products;

    const byBasePlan = new Map<string, Product>();
    for (const product of products) {
      const existing = byBasePlan.get(product.identifier);
      if (!existing || (!product.offerId && existing.offerId)) {
        byBasePlan.set(product.identifier, product);
      }
    }
    return [...byBasePlan.values()];
  }

  async purchase(product: Product): Promise<boolean> {
    const platform = this.getPlatform();
    if (!platform) return false;

    const session = await appIdbStorageManager.getSession();
    if (!session?.userId) return false;

    const appAccountToken = session.userId;

    if (platform === "google") {
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: product.planIdentifier ?? product.identifier,
        productType: PURCHASE_TYPE.SUBS,
        planIdentifier: product.identifier,
        offerToken: product.offerToken,
        appAccountToken,
        autoAcknowledgePurchases: false,
      });
      return await this.registerGoogle(transaction);
    }

    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: product.identifier,
      appAccountToken,
      autoAcknowledgePurchases: false,
    });
    return await this.registerApple(transaction);
  }

  async restore(): Promise<number> {
    const platform = this.getPlatform();
    if (!platform) return 0;

    await NativePurchases.restorePurchases();

    const { purchases } = await NativePurchases.getPurchases(
      platform === "google"
        ? { productType: PURCHASE_TYPE.SUBS }
        : { onlyCurrentEntitlements: true },
    );

    let granted = 0;
    for (const purchase of purchases) {
      const success =
        platform === "google"
          ? await this.registerGoogle(purchase)
          : await this.registerApple(purchase);
      if (success) granted++;
    }

    await this.capabilitiesService.updateCapabilities();

    return granted;
  }

  async manageSubscriptions(): Promise<void> {
    await NativePurchases.manageSubscriptions();
  }

  private async registerApple(transaction: Transaction): Promise<boolean> {
    if (!transaction.jwsRepresentation && !transaction.transactionId) {
      return false;
    }

    const result = await this.serverActionsService.iap.registerApplePurchase(
      {
        jwsRepresentation: transaction.jwsRepresentation,
        transactionId: transaction.transactionId,
      },
      {
        400: () => undefined,
        403: () => undefined,
      },
    );

    const granted = Boolean(result?.granted);
    if (granted && transaction.transactionId) {
      await NativePurchases.acknowledgePurchase({
        purchaseToken: transaction.transactionId,
      });
    }

    await this.capabilitiesService.updateCapabilities();

    return granted;
  }

  private async registerGoogle(transaction: Transaction): Promise<boolean> {
    if (!transaction.purchaseToken) {
      return false;
    }

    const result = await this.serverActionsService.iap.registerGooglePurchase(
      {
        purchaseToken: transaction.purchaseToken,
      },
      {
        400: () => undefined,
        403: () => undefined,
      },
    );

    await this.capabilitiesService.updateCapabilities();

    return Boolean(result?.granted);
  }
}
