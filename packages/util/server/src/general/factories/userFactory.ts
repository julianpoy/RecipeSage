import { faker } from "@faker-js/faker";

export function userFactory() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
  };
}
