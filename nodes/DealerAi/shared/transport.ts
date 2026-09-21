import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

export interface DealerAiApiResponse {
	body: unknown;
	headers?: IDataObject;
	statusCode: number;
	statusMessage?: string;
}

export interface DealerAiRequest {
	baseUrl: string;
	method: IHttpRequestMethods;
	path: string;
	query?: IDataObject;
	headers?: IDataObject;
	body?: IHttpRequestOptions['body'];
	json?: boolean;
	encoding?: IHttpRequestOptions['encoding'];
	timeout: number;
}

export async function dealerAiApiRequest(
	this: IExecuteFunctions,
	request: DealerAiRequest,
): Promise<DealerAiApiResponse> {
	const options: IHttpRequestOptions = {
		method: request.method,
		url: `${request.baseUrl.replace(/\/+$/, '')}${request.path}`,
		headers: {
			Accept: 'application/json',
			...request.headers,
		},
		qs: request.query,
		arrayFormat: 'repeat',
		body: request.body,
		json:
			request.json ??
			(!request.headers?.['Content-Type']?.toString().includes('multipart/form-data') &&
				!request.headers?.['Content-Type']?.toString().includes('xml')),
		encoding: request.encoding,
		timeout: request.timeout,
		returnFullResponse: true,
	};

	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'dealerAiApi',
		options,
	)) as DealerAiApiResponse;
}

export function extractDealerAiError(error: unknown): {
	message: string;
	httpCode?: number;
	apiResponse?: unknown;
} {
	const candidate = error as {
		message?: string;
		httpCode?: number;
		statusCode?: number;
		response?: {
			status?: number;
			statusCode?: number;
			data?: unknown;
			body?: unknown;
		};
	};
	const apiResponse = candidate.response?.data ?? candidate.response?.body;
	const responseObject = apiResponse as
		| {
				detail?: string;
				title?: string;
				message?: string;
				error?: string | { message?: string };
			errors?: Array<{ message?: string; code?: string }> | Record<string, string[]>;
		}
		| undefined;
	const firstValidationError =
		responseObject?.errors && !Array.isArray(responseObject.errors)
			? Object.values(responseObject.errors).flat()[0]
			: undefined;
	const message =
		responseObject?.detail ??
		responseObject?.message ??
		(typeof responseObject?.error === 'string'
			? responseObject.error
			: responseObject?.error?.message) ??
		(Array.isArray(responseObject?.errors) ? responseObject.errors[0]?.message : firstValidationError) ??
		responseObject?.title ??
		candidate.message ??
		'DealerAI request failed';
	return {
		message,
		httpCode:
			candidate.httpCode ??
			candidate.statusCode ??
			candidate.response?.statusCode ??
			candidate.response?.status,
		apiResponse,
	};
}
