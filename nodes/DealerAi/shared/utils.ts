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
		description:
			field.description ??
			(field.format === 'binary'
				? `Name of the incoming binary property to send as the Swagger field "${field.name}"`
				: `Swagger ${location} field "${field.name}"`),
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
