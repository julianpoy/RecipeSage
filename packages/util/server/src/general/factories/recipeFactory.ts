import { faker } from "@faker-js/faker";

export function recipeFactory(userId: string) {
  return {
    userId,
    title: faker.string.alphanumeric(10),
    description: faker.string.alphanumeric(10),
    yield: faker.string.alphanumeric(10),
    folder: "main",
    activeTime: faker.string.alphanumeric(10),
    totalTime: faker.string.alphanumeric(10),
    source: faker.string.alphanumeric(10),
    url: faker.string.alphanumeric(10),
    notes: faker.string.alphanumeric(10),
    ingredients: faker.string.alphanumeric(10),
    instructions: faker.string.alphanumeric(10),
    rating: faker.number.int({ min: 1, max: 5 }),
  };
}
