import { Injectable, inject } from "@angular/core";
import { EventName, EventService } from "./event.service";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { HttpService } from "./http.service";
import { UtilService } from "./util.service";
import { TRPCService } from "./trpc.service";

export interface MealOption {
  id: string;
  title: string;
  mealTime: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: "root",
})
export class MealOptionService {
  events = inject(EventService);
  utilService = inject(UtilService);
  httpService = inject(HttpService);
  httpErrorHandlerService = inject(HttpErrorHandlerService);
  trpcService = inject(TRPCService);

  fetch(
    params?: {
      title?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.trpcService.handle(
      this.trpcService.trpc.mealOptions.get.query(params || {}),
    );
  }

  async create(
    payload: {
      title: string;
      mealTime: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.mealOptions.create.mutate(payload),
    );

    this.events.publish(EventName.MealOptionCreated);

    return response;
  }

  async update(
    mealOptionId: string,
    payload: {
      title: string;
      mealTime: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.mealOptions.update.mutate({
        id: mealOptionId,
        ...payload,
      }),
    );

    this.events.publish(EventName.MealOptionUpdated);

    return response;
  }

  async delete(mealOptionId: string, errorHandlers?: ErrorHandlers) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.mealOptions.remove.mutate({
        id: mealOptionId,
      }),
    );

    this.events.publish(EventName.MealOptionDeleted);

    return response;
  }
}
