import { describe, expect, it } from 'vitest';
import type { InferAnyError, InferError, InferErrorCodes } from '../src/index';
import * as errf from '../src/index';

/**
 * In some places we use @ts-expect-error to easily test types. If you see it that's what it's for.
 */

const error = errf.create({
	InvalidArgumentError: {
		code: 'USER_001',
		message: (args: { field: string; value?: unknown }) =>
			`Invalid argument: ${args.field} = ${args.value}`,
		userMessage: (args: { field: string; value?: unknown }) =>
			`Invalid argument: ${args.field} = ${args.value}`,
	},
	InternalError: {
		code: 'INTERNAL_001',
		message: (args: { message: string }) => `Internal error: ${args.message}`,
	},
	InternalError2: {
		code: 'INTERNAL_002',
		message: (args: { message: string }) => `Internal error 2: ${args.message}`,
	},
});

type Error<T extends keyof typeof error> = InferError<typeof error, T>;

type InternalError = Error<'InternalError'>;

type ErrorCodes = InferErrorCodes<typeof error>;

type AnyError = InferAnyError<typeof error>;

// should not error
const _anyError: AnyError = error.InternalError({ message: 'test' });

// @ts-expect-error - This should be an error
const _errorCode: ErrorCodes = 'test';

// @ts-expect-error - This should be an error
const _internalError: InternalError = error.InternalError2({ message: 'test' });

describe('create', () => {
	it('Should create the correct error', () => {
		const e = error.InternalError({ message: 'test' });

		expect(e.message).toBe('Internal error: test');
		expect(e.code).toBe('INTERNAL_001');
		expect(e.type).toBe('internal');
		expect(e.name).toBe('InternalError');
		expect(e.recoverable).toBe(false);
		expect(e.config).toEqual({ message: 'test' });
	});
});

describe('match', () => {
	it('Should match the correct error', () => {
		const fake = () => true;

		// now can be either error
		const e = fake()
			? error.InternalError({ message: 'test' })
			: error.InvalidArgumentError({ field: 'test', value: 'test' });

		const result = errf.match(e, {
			InternalError: (e) => e.message,
			InvalidArgumentError: (e) => e.message,
		});

		expect(result).toBe('Internal error: test');

		// error matching should be exhaustive if it isn't tsc will fail the next line

		// @ts-expect-error User must handle every possible case
		errf.match(e, {
			InternalError: (e) => e.message,
		});
	});
});

describe('mapToUserFacingError', () => {
	it('Should map the error to a user facing error', () => {
		const fake = () => true;

		// now can be either error
		const e = fake()
			? error.InternalError({ message: 'test' })
			: error.InvalidArgumentError({ field: 'test', value: 'test' });

		// only should have to handle internal errors
		const result = errf.mapToUserFacingError(e, {
			InternalError: () => 'There was an error serving your request',
		});

		expect(result.userMessage).toBe('There was an error serving your request');
		expect(result.message).toBe('Internal error: test');
		expect(result.code).toBe('INTERNAL_001');
		expect(result.type).toBe('user');
		expect(result.name).toBe('InternalError');
		expect(result.recoverable).toBe(false);
		expect(result.config).toEqual({ message: 'test' });

		// users should only have to handle internal errors otherwise tsc will fail the next line

		errf.mapToUserFacingError(e, {
			InternalError: (e) => e.message,
			// @ts-expect-error Shouldn't need to handle user facing errors
			InvalidArgumentError: (e) => e.message,
		});
	});
});
