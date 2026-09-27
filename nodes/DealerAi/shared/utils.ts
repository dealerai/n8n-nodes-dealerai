import type { IDataObject, INodeProperties, NodeParameterValueType } from 'n8n-workflow';
import type {
	DealerAiFieldSpec,
	DealerAiOperationSpec,
	DealerAiParameterLocation,
} from '../types';

export const fieldParameterName = (
	location: DealerAiParameterLocation | 'body',
	name: string,
): string => `${location}__${name.replace(/[^a-zA-Z0-9_]/g, '_')}`;

export const rootBodyParameterName = 'body__root';

export function hasOwn(value: IDataObject, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(value, key);
}

export function normalizeParameterValue(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
	) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return value;
		}
	}
	return value;
}

const fieldType = (field: DealerAiFieldSpec): INodeProperties['type'] => {
	if (field.format === 'binary') return 'string';
	if (field.enum?.length) return 'options';
	if (field.format === 'date-time' || field.format === 'date') return 'dateTime';
	if (field.type === 'boolean') return 'boolean';
	if (field.type === 'integer' || field.type === 'number') return 'number';
	if (field.type === 'array' || field.type === 'object' || field.schemaName) return 'json';
	return 'string';
};

const defaultValue = (field: DealerAiFieldSpec): NodeParameterValueType => {
	if (field.default !== undefined) return field.default as NodeParameterValueType;
	if (field.format === 'binary') return 'data';
	if (field.type === 'boolean') return false;
	if (field.type === 'integer' || field.type === 'number') return 0;
	if (field.type === 'array') return '[]';
	if (field.type === 'object' || field.schemaName) return '{}';
	return '';
};

const booleanDescriptions: Record<string, string> = {
	'body:force':
		'Whether to re-extract a promotion that was modified after its last extraction; requires \'Overwrite\' to be enabled',
	'body:in_sequence': 'Whether the contact must already be enrolled in a sequence',
	'body:is_active': 'Whether to mark the created promotion as active',
	'body:is_department_only': 'Whether this personnel entry represents a department instead of a person',
	'body:overwrite': 'Whether to overwrite an existing promotion with the same site URL',
	'body:root': 'Whether the promotion is active',
	'query:IncludeAll': 'Whether to include all knowledge-base entries',
	'query:IncludeContent': 'Whether to include the full knowledge-base entry content',
	'query:IncludeIsArchived': 'Whether to include archived conversations',
	'query:includeMessages': 'Whether to include conversation messages in the response',
	'query:isActive': 'Whether to return active promotions instead of inactive promotions',
	'query:isExtracted': 'Whether to return extracted promotions instead of unextracted promotions',
};

const fieldDescription = (
	field: DealerAiFieldSpec,
	location: DealerAiParameterLocation | 'body',
): string => {
	if (field.type === 'boolean') {
		return (
			booleanDescriptions[`${location}:${field.name}`] ??
			`Whether to enable '${field.displayName}'`
		);
	}
	return (
		field.description ??
		(field.format === 'binary'
			? `Name of the incoming binary property to send as the Swagger field "${field.name}"`
			: `Swagger ${location} field "${field.name}"`)
	);
};

export function fieldToNodeProperty(
	field: DealerAiFieldSpec,
	location: DealerAiParameterLocation | 'body',
	required: boolean,
): INodeProperties {
	const type = fieldType(field);
	const property: INodeProperties = {
		displayName: field.format === 'binary' ? `${field.displayName} Binary Property` : field.displayName,
		name: fieldParameterName(location, field.name),
		type,
		default: defaultValue(field),
		description: fieldDescription(field, location),
		required,
	};
	if (field.enum?.length) {
		property.options = field.enum.map((value) => ({
			name: String(value),
			value,
		}));
	}
	const numberValidation: IDataObject = {};
	if (field.minimum !== undefined) numberValidation.minValue = field.minimum;
	if (field.maximum !== undefined) numberValidation.maxValue = field.maximum;
	if (Object.keys(numberValidation).length) property.typeOptions = numberValidation;
	return property;
}

export function rootBodyField(operation: DealerAiOperationSpec): DealerAiFieldSpec | undefined {
	if (!operation.body || operation.body.rootType === 'object') return undefined;
	const format = operation.body.mediaType.includes('xml') ? 'xml' : operation.body.schema.format;
	return {
		name: 'root',
		displayName:
			operation.body.rootType === 'array'
				? 'Request Body'
				: operation.body.rootType === 'boolean'
					? 'Active'
					: 'Request Body',
		required: operation.body.required,
		description: operation.body.description,
		type: operation.body.rootType,
		format,
		items: operation.body.schema.items,
		schemaName: operation.body.schemaName,
	};
}
