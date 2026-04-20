type Handler<T = unknown> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on<T>(event: string, handler: Handler<T>): () => void {
    const bucket = this.handlers.get(event) ?? new Set<Handler>();
    bucket.add(handler as Handler);
    this.handlers.set(event, bucket);
    return () => bucket.delete(handler as Handler);
  }

  emit<T>(event: string, payload: T): void {
    const bucket = this.handlers.get(event);
    if (!bucket) return;
    for (const handler of bucket) handler(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
