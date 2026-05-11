import { faker } from "@faker-js/faker";

export function labelFactory(userId: string) {
  return {
    userId,
    title: faker.string.alphanumeric(10),
  };
}
