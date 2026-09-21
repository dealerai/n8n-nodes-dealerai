import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DealerAiApi implements ICredentialType {
	name = 'dealerAiApi';

	displayName = 'DealerAI API';

	icon: Icon = { light: 'file:../icons/dealerai.svg', dark: 'file:../icons/dealerai.dark.svg' };

	documentationUrl = 'https://api.dealerai.com/api-docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.dealerai.com',
			required: true,
			description:
				'DealerAI API origin. The Swagger does not declare a server URL, so the production API host is used by default.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
				sendImmediately: true,
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/authentication/verify',
			method: 'POST',
		},
	};
}
