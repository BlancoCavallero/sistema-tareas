/**
 * Storage adapter for document bytes.
 *
 * Deferred implementation (document-library change): the R2 binding for the
 * free tier is not verified yet, so byte storage lands in a follow-up change.
 * Metadata tables in D1 ship regardless. Consumers depend on this interface so
 * the storage backend can be swapped without touching callers.
 */
export interface StorageAdapter {
	put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
	delete(key: string): Promise<void>;
	list(prefix: string): Promise<string[]>;
}
