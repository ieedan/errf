type CreateErrorsError<Code extends string, Config> = {
	readonly code: Code;
	message: ((args: Config) => string) | string;
	userMessage?: ((args: Config) => string) | string;
	recoverable?: boolean;
};

type IsStringOrFunction<T> = T extends string
	? true
	: T extends (...args: any[]) => any
		? true
		: false;

type AppError<
	Key extends string,
	Code extends string,
	UserMessage,
	Config,
> = IsStringOrFunction<UserMessage> extends true
	? _UserFacingError<Key, Code, string, Config>
	: _InternalError<Key, Code, Config>;

type _UserFacingError<
	Key extends string,
	Code extends string,
	UserMessage extends string,
	Config,
> = {
	type: 'user';
	name: Key;
	code: Code;
	message: string;
	userMessage: UserMessage;
	recoverable: boolean;
	config: Config;
	cause?: unknown;
	timestamp: number;
};

type _InternalError<Key extends string, Code extends string, Config> = {
	type: 'internal';
	name: Key;
	code: Code;
	message: string;
	recoverable: boolean;
	config: Config;
	cause?: unknown;
	timestamp: number;
};

/**
 * Internal error type. These errors should never be exposed to the user.
 */
export type InternalError = _InternalError<string, string, unknown>;
/**
 * User facing error type. These errors should be safe to expose to the user.
 */
export type UserFacingError = _UserFacingError<string, string, string, unknown>;
export type AnyError = InternalError | UserFacingError;

export type ErrorFactory<
	T extends Record<string, CreateErrorsError<string, any>>,
> = {
	[K in keyof T]: T[K]['message'] extends (args: infer A) => string
		? (
				args: A,
				cause?: unknown,
			) => AppError<K & string, T[K]['code'], T[K]['userMessage'], A>
		: (
				cause?: unknown,
			) => AppError<K & string, T[K]['code'], T[K]['userMessage'], undefined>;
};

/**
 * Create an error factory.
 *
 * @param errors The errors that can be created by the factory.
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
 * error.ApiError({ url: 'https://example.com' });
 * ```
 */
export function create<
	Code extends string,
	T extends Record<string, CreateErrorsError<Code, any>>,
>(errors: T): ErrorFactory<T> {
	const error = {};

	for (const [k, v] of Object.entries(errors)) {
		const key = k;
		const value = v as CreateErrorsError<any, any>;

		if (value.userMessage) {
			(error as any)[key] = (args: any, cause?: unknown) => ({
				type: 'user',
				name: key,
				code: value.code,
				message:
					typeof value.message === 'function'
						? value.message(args)
						: value.message,
				userMessage:
					typeof value.userMessage === 'function'
						? value.userMessage(args)
						: value.userMessage,
				recoverable: value.recoverable ?? false,
				config: args,
				cause,
				timestamp: Date.now(),
			});
		} else {
			(error as any)[key] = (args: any, cause?: unknown) => ({
				type: 'internal',
				name: key,
				code: value.code,
				message:
					typeof value.message === 'function'
						? value.message(args)
						: value.message,
				recoverable: value.recoverable ?? false,
				config: args,
				cause,
				timestamp: Date.now(),
			});
		}
	}

	return error as ErrorFactory<T>;
}
