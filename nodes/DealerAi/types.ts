import type { IHttpRequestMethods } from 'n8n-workflow';

export type DealerAiParameterLocation = 'path' | 'query' | 'header';

export interface DealerAiSchemaSummary {
	type?: string;
	format?: string;
	description?: string;
	enum?: readonly (string | number | boolean)[];
	default?: unknown;
	example?: unknown;
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	items?: {
		type?: string;
		format?: string;
		schemaName?: string;
	};
	schemaName?: string;
}

export interface DealerAiFieldSpec extends DealerAiSchemaSummary {
	name: string;
	displayName: string;
	required: boolean;
}

export interface DealerAiParameterSpec extends DealerAiFieldSpec {
	in: DealerAiParameterLocation;
}

export interface DealerAiBodySpec {
	required: boolean;
	description?: string;
	mediaType: string;
	rootType?: string;
	schemaName?: string;
	fields: readonly DealerAiFieldSpec[];
	schema: DealerAiSchemaSummary;
}

export interface DealerAiOperationSpec {
	id: string;
	tag: string;
	resource: string;
	resourceDisplayName: string;
	name: string;
	value: string;
	action: string;
	description: string;
	method: IHttpRequestMethods;
	path: string;
	parameters: readonly DealerAiParameterSpec[];
	body?: DealerAiBodySpec;
	responseCodes: Readonly<Record<string, string>>;
}
