import type { AnyError, ErrorFactory, UserFacingError } from './factory';

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

/**
 * Get all possible errors from an error factory.
 *
 * @example
 * ```ts
 * type Errors = InferAnyError<typeof error>;
 * // ApiError | EmailError
 *
 * const error = errf.create({
 *     ApiError: {
 *         code: "API_001",
 *         message: (args: { url: string }) => `Error fetching ${args.url}`,
 *     },
 *     EmailError: {
 *         code: "EMAIL_001",
 *         message: (args: { email: string }) => `Error sending email to ${args.email}`,
 *     },
 * });
 * ```
 */
export type InferAnyError<Factory extends ErrorFactory<any>> = ReturnType<
	Factory[keyof Factory]
>;

/**
 * Get a specific error from an error factory.
 *
 * @example
 * ```ts
 * type Error = InferError<typeof error, 'ApiError'>;
 * // ApiError
 *
 * // Export a helper type to get the type of an error by name
 * export type Error<K extends keyof typeof error> = InferError<typeof error, K>;
 *
 * // Now you can use each error individually
 * function foo(): Result<..., Error<'ApiError'>> {
 *     // ...
 * }
 * ```
 */
export type InferError<
	Factory extends ErrorFactory<any>,
	Key extends keyof Factory,
> = ReturnType<Factory[Key]>;

/**
 * Get the error codes from an error factory.
 *
 * @example
 * ```ts
 * type ErrorCodes = InferErrorCodes<typeof error>;
 * // "API_001" | "EMAIL_001"
 * ```
 */
export type InferErrorCodes<Factory extends ErrorFactory<any>> = ReturnType<
	Factory[keyof Factory]
>['code'];
