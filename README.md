# errf ⚠️

![NPM Downloads](https://img.shields.io/npm/dm/errf)

A json-serializable, incredibly ergonomic way of defining and working with errors in your TypeScript applications.

```ts
import * as errf from ".";

// Define your errors

export type Error<K extends keyof typeof error> = errf.InferError<typeof error, K>;

const error = errf.create({
	ApiError: {
		code: "API_001",
		message: (args: { url: string }) => `Error fetching ${args.url}`,
	},
	EmailError: {
		code: "EMAIL_001",
		message: (args: { email: string }) => `Error sending email to ${args.email}`,
	},
});

// Write safe code

import type { Result } from "neverthrow";
import type { Error, error } from "./errors";

function safeFn(): Result<string, Error<"ApiError"> | Error<"EmailError">> {
	// ...
}

const result = safeFn().match(
	(v) => console.log(v),
	(e) => {
		errf.match(e, {
			ApiError: (e) => console.log(`We couldn't service your request to ${e.config.url}`),
			EmailError: () => console.error("We encountered an unexpected error"),
		});
	}
);
```

## Introduction

With the addition of libraries like [neverthrow](https://github.com/supermacro/neverthrow) the JS community has started to realize the power of "never throwing" and instead returning results. This library is a great way to compliment that pattern.

## Getting Started

Install `errf`:

```sh
npm i errf
```

Define your errors:

```ts
import * as errf from "errf";

const error = errf.create({
	ApiError: {
		code: "API_001",
		message: (args: { url: string }) => `Error fetching ${args.url}`,
	},
	EmailError: {
		code: "EMAIL_001",
		message: (args: { email: string }) => `Error sending email to ${args.email}`,
	},
});
```

Create errors by calling them as functions:

```ts
import { ResultAsync } from "nevereverthrow";
import { error } from "./errors";

const url = "https://api.example.com/data";

const result = ResultAsync.fromPromise(
	() => fetch(url),
	(e) => error.ApiError({ url }, e) // optionally add the cause
);
```

## Internal and User Facing Errors

Errors defined with the `userMessage` property considered user facing errors. These are errors that are allowed to be shown to the user.

> [!IMPORTANT] 
> Internal errors should never be shown to the user.

### Error Handling Utilities

Often times error handling can be verbose and it is expected for you to create utility functions for handling your user facing errors.

We can import the `UserFacingError` type from `errf` to ensure that we are only passing user facing errors to the function.

> For functions expecting only internal errors you can use the `InternalError` type.

```ts
import { UserFacingError } from "errf";

function showErrorToast(error: UserFacingError) {
    // ...
}
```

### Mapping Internal Errors to User Facing Errors

You will often find yourself wanting to map an internal error to better user facing message. This can be done with the `mapToUserFacingError` function.

> This can also be useful for localizing your error messages!

```ts
import * as errf from "errf";

// ...

const userFacingError = result.mapError((e) => errf.mapToUserFacingError(e, {
    ApiError: (e) => `There was an error serving your request from ${e.config.url}`,
}));
```

## Types

Here are a few types you may want to implement to make using `errf` easier:

```ts
import * as errf from "errf";

// allows you to get the type of an error by name i.e. Error<"ApiError">
export type Error<K extends keyof typeof error> = errf.InferError<typeof error, K>;

// A union of all defined errors
export type AnyError = errf.InferAnyError<typeof error>;

// A union of all defined error codes
export type ErrorCodes = errf.InferErrorCodes<typeof error>;

const error = errf.create({
    ApiError: {
        code: "API_001",
        message: (args: { url: string }) => `Error fetching ${args.url}`,
    },
    EmailError: {
        code: "EMAIL_001",
        message: (args: { email: string }) => `Error sending email to ${args.email}`,
    },
});
```

## Tips

### Flattening Thrown Errors

One thing I run into often when calling my own APIs is that there are multiple types of errors. There are the errors that you prepare for on the server and those that you can't prepare for like network errors on the client. For this we will often want to wrap our network calls in a try catch which can make handling errors as results a bit tedious especially if you want to *never throw*.

One solution to this is to flatten the errors into a single error type with a function like this:
```ts
export async function flatten<T, E extends AnyError, E2 extends AnyError>(
	promise: Promise<Result<T, E>>,
	mapThrownError: (e: unknown) => E2
): Promise<Result<T, E | E2>> {
	return promise.catch((e) => err(mapThrownError(e)));
}
```

This way we catch any errors throw by the promise which would be unexpected and then map them to the expected error type using the mapThrownError function. This way instead of ignoring the possibility of a thrown error we can handle it and return a result.