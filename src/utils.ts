import type { AnyError, UserFacingError } from './factory';

type ErrorHandlers<T extends AnyError, O> = {
	[K in T['name']]: (error: Extract<T, { name: K }>) => O;
};

/**
 * Ensures the caller handles all possible types of `error`.
 *
 * @param error - The error to match
 * @param handlers - The handlers for each error type
 * @returns
 *
 * @example
 * ```ts
 * const error = errf.create({
 *     ApiError: {
 *         code: "API_001",
 *         message: (args: { url: string }) => `Error fetching ${args.url}`,
 *     },
 * });
 *
 * const result = match(error.ApiError({ url: 'https://example.com' }), {
 *     ApiError: (e) => {
 *         // ...
 *     },
 * });
 * ```
 */
export function match<T extends AnyError, O>(
	error: T,
	handlers: ErrorHandlers<T, O>,
): O {
	return (handlers as any)[error.name](error);
}

type InternalErrorHandlers<T extends AnyError, O> = {
	[K in T['name']]: Extract<T, { name: K }> extends { type: 'internal' }
		? (error: Extract<T, { name: K }>) => O
		: never;
};

type NeverNever<T> = {
	[K in keyof T as T[K] extends never ? never : K]: T[K];
};

/**
 * Maps an internal error into a user facing error.
 *
 * @param error - The error to map.
 * @param map - A function that maps the internal error to a user facing error message.
 * @returns
 *
 * @example
 * ```ts
 * const error = errf.create({
 *     ApiError: {
 *         code: "API_001",
 *         message: (args: { url: string }) => `Error fetching ${args.url}`,
 *     },
 * });
 *
 * const result = mapToUserFacingError(error.ApiError({ url: 'https://example.com' }), {
 *     ApiError: (e) => 'User facing error message',
 * });
 */
export function mapToUserFacingError<E extends AnyError>(
	error: E,
	handlers: NeverNever<InternalErrorHandlers<E, string>>,
): UserFacingError {
	if (error.type === 'user') return error;

	const message = (handlers as any)[error.name](error);

	return {
		...error,
		type: 'user',
		userMessage: message,
	};
}
