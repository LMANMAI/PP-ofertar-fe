export const MOCK_USER = {
	email: "test@ofertar.ar",
	password: "test1234",
	firstName: "Martina",
	lastName: "Alvarez",
} as const;

export type MockSession = {
	email: string;
	firstName: string;
	lastName: string;
	initials: string;
};

export function validateCredentials(
	email: string,
	password: string,
): MockSession | null {
	if (
		email.trim().toLowerCase() === MOCK_USER.email &&
		password === MOCK_USER.password
	) {
		return {
			email: MOCK_USER.email,
			firstName: MOCK_USER.firstName,
			lastName: MOCK_USER.lastName,
			initials:
				(MOCK_USER.firstName[0] ?? "") + (MOCK_USER.lastName[0] ?? ""),
		};
	}
	return null;
}
