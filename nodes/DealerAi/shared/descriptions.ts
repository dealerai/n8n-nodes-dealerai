import type { INodeProperties } from 'n8n-workflow';
import { dealerAiOperations } from '../generated/operations.generated';
import type { DealerAiFieldSpec, DealerAiOperationSpec } from '../types';
import { fieldToNodeProperty, rootBodyField } from './utils';

const resources = [...new Map(dealerAiOperations.map((operation) => [operation.resource, operation])).values()]
	.map((operation) => ({
		name: operation.resourceDisplayName,
		value: operation.resource,
	}))
	.sort((left, right) => left.name.localeCompare(right.name));

const operationProperties = (
	resource: string,
	operations: readonly DealerAiOperationSpec[],
): INodeProperties[] => {
	const properties: INodeProperties[] = [
		// The default is generated from the first option for this Swagger resource.
		// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource] } },
			options: [...operations]
				.sort((left, right) => left.name.localeCompare(right.name))
				.map((operation) => ({
					name: operation.name,
					value: operation.value,
					action: operation.action,
					description: operation.description,
				})),
			default: [...operations].sort((left, right) => left.name.localeCompare(right.name))[0].value,
		},
	];

	for (const operation of operations) {
		const show = { resource: [operation.resource], operation: [operation.value] };
		const requiredFields: Array<{
			field: DealerAiFieldSpec;
			location: 'path' | 'query' | 'header' | 'body';
		}> = operation.parameters
			.filter((parameter) => parameter.required)
			.map((field) => ({ field, location: field.in }));
		requiredFields.push(
			...(operation.body?.fields ?? [])
				.filter((field) => field.required)
				.map((field) => ({ field, location: 'body' as const })),
		);
		const rootField = rootBodyField(operation);
		if (rootField?.required) requiredFields.push({ field: rootField, location: 'body' });

		for (const { field, location } of requiredFields) {
			properties.push({
				...fieldToNodeProperty(field, location, true),
				displayOptions: { show },
			});
		}

		const optionalFields: Array<{
			field: DealerAiFieldSpec;
			location: 'path' | 'query' | 'header' | 'body';
		}> = operation.parameters
			.filter((parameter) => !parameter.required)
			.map((field) => ({ field, location: field.in }));
		optionalFields.push(
			...(operation.body?.fields ?? [])
				.filter((field) => !field.required)
				.map((field) => ({ field, location: 'body' as const })),
		);
		if (rootField && !rootField.required) optionalFields.push({ field: rootField, location: 'body' });

		if (optionalFields.length) {
			properties.push({
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show },
				options: optionalFields
					.map(({ field, location }) => fieldToNodeProperty(field, location, false))
					.sort((left, right) => left.displayName.localeCompare(right.displayName)),
			});
		}
	}
	return properties;
};

const groupedOperations = dealerAiOperations.reduce(
	(grouped, operation) => {
		(grouped[operation.resource] ??= []).push(operation);
		return grouped;
	},
	{} as Record<string, DealerAiOperationSpec[]>,
);

export const dealerAiProperties: INodeProperties[] = [
	// The default is generated from the alphabetically first Swagger resource.
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: resources,
		default: resources[0].value,
	},
	...resources.flatMap(({ value }) => operationProperties(value, groupedOperations[value] ?? [])),
	{
		displayName: 'Request Settings',
		name: 'requestSettings',
		type: 'collection',
		placeholder: 'Add Setting',
		default: {},
		options: [
			{
				displayName: 'Timeout (Milliseconds)',
				name: 'timeout',
				type: 'number',
				default: 30000,
				description: 'Maximum time to wait for DealerAI before aborting the request',
				typeOptions: { minValue: 1000, maxValue: 300000 },
			},
		],
	},
];
