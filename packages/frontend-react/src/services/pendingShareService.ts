export type PendingShare =
  | { kind: "url"; url: string }
  | { kind: "document"; file: File }
  | { kind: "images"; files: File[] };

class PendingShareService {
  private pending?: PendingShare;

  set(pending: PendingShare) {
    this.pending = pending;
  }

  consume(): PendingShare | undefined {
    const pending = this.pending;
    this.pending = undefined;
    return pending;
  }

  peek(): PendingShare | undefined {
    return this.pending;
  }
}

export const pendingShareService = new PendingShareService();
