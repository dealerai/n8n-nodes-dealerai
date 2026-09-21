import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { dealerAiOperations } from './generated/operations.generated';
import { dealerAiProperties } from './shared/descriptions';
import {
	dealerAiApiRequest,
	extractDealerAiError,
	type DealerAiApiResponse,
} from './shared/transport';
import {
	fieldParameterName,
	hasOwn,
	normalizeParameterValue,
	rootBodyField,
} from './shared/utils';
import type { DealerAiFieldSpec, DealerAiOperationSpec } from './types';

const operationByKey = new Map(
	dealerAiOperations.map((operation) => [
		`${operation.resource}:${operation.value}`,
		operation as DealerAiOperationSpec,
	]),
);

function outputFromResponse(response: DealerAiApiResponse, itemIndex: number): INodeExecutionData {
	return {
		json: {
			data: response.body as IDataObject,
			statusCode: response.statusCode,
			...(response.statusMessage ? { statusMessage: response.statusMessage } : {}),
			...(response.headers ? { headers: response.headers } : {}),
		},
		pairedItem: { item: itemIndex },
	};
}

function getFieldValue(
	context: IExecuteFunctions,
	itemIndex: number,
	field: DealerAiFieldSpec,
	location: 'path' | 'query' | 'header' | 'body',
	required: boolean,
	additionalFields: IDataObject,
): unknown {
	const parameterName = fieldParameterName(location, field.name);
	const value = required
		? context.getNodeParameter(parameterName, itemIndex)
		: additionalFields[parameterName];
	return normalizeParameterValue(value);
}

async function createRequestBody(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: DealerAiOperationSpec,
	additionalFields: IDataObject,
): Promise<{
	body?: unknown;
	headers?: IDataObject;
	json?: boolean;
	encoding?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
}> {
	if (!operation.body) return {};
	const rootField = rootBodyField(operation);
	if (rootField) {
		const value = getFieldValue(
			context,
			itemIndex,
			rootField,
			'body',
			rootField.required,
			additionalFields,
		);
		if (value === undefined) return {};
		if (operation.body.mediaType.includes('json') && operation.body.rootType !== 'object') {
			return {
				body: JSON.stringify(value),
				headers: { 'Content-Type': operation.body.mediaType },
				json: false,
				encoding: 'json',
			};
		}
		return {
			body: value,
			headers: { 'Content-Type': operation.body.mediaType },
		};
	}

	if (operation.body.mediaType === 'multipart/form-data') {
		const boundary = `----n8nDealerAiBoundary${itemIndex}`;
		const parts: Buffer[] = [];
		let hasValues = false;
		for (const field of operation.body.fields) {
			const parameterName = fieldParameterName('body', field.name);
			if (!field.required && !hasOwn(additionalFields, parameterName)) continue;
			const value = getFieldValue(
				context,
				itemIndex,
				field,
				'body',
				field.required,
				additionalFields,
			);
			if (value === undefined) continue;
			if (field.format === 'binary') {
				const binaryProperty = String(value);
				const binaryData = context.getInputData()[itemIndex].binary?.[binaryProperty];
				if (!binaryData) {
					throw new NodeOperationError(
						context.getNode(),
						`No binary data property named "${binaryProperty}" exists on item ${itemIndex}`,
						{ itemIndex },
					);
				}
				const buffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
				const filename = (binaryData.fileName || 'upload').replace(/"/g, '%22');
				parts.push(
					Buffer.from(
						`--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"; filename="${filename}"\r\nContent-Type: ${binaryData.mimeType || 'application/octet-stream'}\r\n\r\n`,
					),
					buffer,
					Buffer.from('\r\n'),
				);
			} else {
				parts.push(
					Buffer.from(
						`--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"\r\n\r\n${String(value)}\r\n`,
					),
				);
			}
			hasValues = true;
		}
		if (!hasValues) return {};
		parts.push(Buffer.from(`--${boundary}--\r\n`));
		return {
			body: Buffer.concat(parts),
			headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
		};
	}

	const body: IDataObject = {};
	for (const field of operation.body.fields) {
		const parameterName = fieldParameterName('body', field.name);
		if (!field.required && !hasOwn(additionalFields, parameterName)) continue;
		const value = getFieldValue(
			context,
			itemIndex,
			field,
			'body',
			field.required,
			additionalFields,
		);
		if (value !== undefined) body[field.name] = value as IDataObject[string];
	}
	return Object.keys(body).length
		? { body, headers: { 'Content-Type': operation.body.mediaType } }
		: {};
}

export class DealerAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DealerAI',
		name: 'dealerAi',
		icon: { light: 'file:../../icons/dealerai.svg', dark: 'file:../../icons/dealerai.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the complete DealerAI API',
		defaults: { name: 'DealerAI' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'dealerAiApi', required: true }],
		properties: dealerAiProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('dealerAiApi');
		const baseUrl = String(credentials.baseUrl);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operationValue = this.getNodeParameter('operation', itemIndex) as string;
				const operation = operationByKey.get(`${resource}:${operationValue}`);
				if (!operation) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported DealerAI operation "${resource}:${operationValue}"`,
						{ itemIndex },
					);
				}

				const additionalFields = this.getNodeParameter(
					'additionalFields',
					itemIndex,
					{},
				) as IDataObject;
				const requestSettings = this.getNodeParameter(
					'requestSettings',
					itemIndex,
					{},
				) as IDataObject;
				const query: IDataObject = {};
				const headers: IDataObject = {};
				let requestPath = operation.path;

				for (const parameter of operation.parameters) {
					const parameterName = fieldParameterName(parameter.in, parameter.name);
					if (!parameter.required && !hasOwn(additionalFields, parameterName)) continue;
					const value = getFieldValue(
						this,
						itemIndex,
						parameter,
						parameter.in,
						parameter.required,
						additionalFields,
					);
					if (value === undefined) continue;
					if (parameter.in === 'path') {
						requestPath = requestPath.replace(
							`{${parameter.name}}`,
							encodeURIComponent(String(value)),
						);
					} else if (parameter.in === 'query') {
						query[parameter.name] = value as IDataObject[string];
					} else {
						headers[parameter.name] = String(value);
					}
				}

				const requestBody = await createRequestBody(
					this,
					itemIndex,
					operation,
					additionalFields,
				);
				const response = await dealerAiApiRequest.call(this, {
					baseUrl,
					method: operation.method,
					path: requestPath,
					query,
					headers: { ...headers, ...requestBody.headers },
					body: requestBody.body as never,
					json: requestBody.json,
					encoding: requestBody.encoding,
					timeout: Number(requestSettings.timeout ?? 30000),
				});
				returnData.push(outputFromResponse(response, itemIndex));
			} catch (error) {
				const details = extractDealerAiError(error);
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: details.message,
							...(details.httpCode ? { httpCode: details.httpCode } : {}),
							...(details.apiResponse !== undefined
								? { apiResponse: details.apiResponse as IDataObject }
								: {}),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), details.message, {
					itemIndex,
					description:
						details.apiResponse !== undefined
							? JSON.stringify(details.apiResponse)
							: undefined,
				});
			}
		}

		return [returnData];
	}
}
