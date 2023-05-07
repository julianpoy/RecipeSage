import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@recipesage/backend-trpc/src';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TRPCService {
  public trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/trpc',
        maxURLLength: 2083,
      }),
    ],
    transformer: undefined,
  });

  constructor() {}
}

