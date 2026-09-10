export interface ExampleRecipeImageDefinition {
  id: string;
  fileName: string;
}

export interface ExampleRecipeNutrition {
  nutritionServingSize: string | null;
  nutritionCalories: number | null;
  nutritionTotalFat: number | null;
  nutritionSaturatedFat: number | null;
  nutritionTransFat: number | null;
  nutritionPolyunsaturatedFat: number | null;
  nutritionMonounsaturatedFat: number | null;
  nutritionCholesterol: number | null;
  nutritionSodium: number | null;
  nutritionTotalCarbs: number | null;
  nutritionDietaryFiber: number | null;
  nutritionTotalSugars: number | null;
  nutritionAddedSugars: number | null;
  nutritionProtein: number | null;
  nutritionVitaminD: number | null;
  nutritionCalcium: number | null;
  nutritionIron: number | null;
  nutritionPotassium: number | null;
}

export interface ExampleRecipeI18nKeys {
  title: string;
  description: string;
  yield: string;
  activeTime: string;
  totalTime: string;
  notes: string;
  ingredients: string;
  instructions: string;
}

export interface ExampleRecipeDefinition {
  slug: string;
  source: string;
  url: string;
  folder: "main";
  rating: number | null;
  images: ExampleRecipeImageDefinition[];
  nutrition: ExampleRecipeNutrition | null;
  i18nKeys: ExampleRecipeI18nKeys;
}

export const exampleRecipeDefinitions: ExampleRecipeDefinition[] = [
  {
    slug: "airFryer",
    source: "Julian Poyourow",
    url: "",
    folder: "main",
    rating: 4,
    images: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        fileName: "airFryer-0.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        fileName: "airFryer-1.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        fileName: "airFryer-2.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000004",
        fileName: "airFryer-3.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000005",
        fileName: "airFryer-4.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000006",
        fileName: "airFryer-5.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000007",
        fileName: "airFryer-6.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000008",
        fileName: "airFryer-7.jpg",
      },
      {
        id: "00000000-0000-0000-0000-000000000009",
        fileName: "airFryer-8.jpg",
      },
    ],
    nutrition: {
      nutritionServingSize: "1/4 of recipe",
      nutritionCalories: 630,
      nutritionTotalFat: 42,
      nutritionSaturatedFat: 10,
      nutritionTransFat: 0,
      nutritionPolyunsaturatedFat: 4.5,
      nutritionMonounsaturatedFat: 26,
      nutritionCholesterol: 35,
      nutritionSodium: 2030,
      nutritionTotalCarbs: 51,
      nutritionDietaryFiber: 6,
      nutritionTotalSugars: 8,
      nutritionAddedSugars: 0,
      nutritionProtein: 14,
      nutritionVitaminD: 0,
      nutritionCalcium: 70,
      nutritionIron: 3.6,
      nutritionPotassium: 1540,
    },
    i18nKeys: {
      title: "seed.exampleRecipes.airFryer.title",
      description: "seed.exampleRecipes.airFryer.description",
      yield: "seed.exampleRecipes.airFryer.yield",
      activeTime: "seed.exampleRecipes.airFryer.activeTime",
      totalTime: "seed.exampleRecipes.airFryer.totalTime",
      notes: "seed.exampleRecipes.airFryer.notes",
      ingredients: "seed.exampleRecipes.airFryer.ingredients",
      instructions: "seed.exampleRecipes.airFryer.instructions",
    },
  },
  {
    slug: "smoothieBowl",
    source: "RecipeSage Discover",
    url: "https://recipesage.com/app/discover/87f70e82-7372-4459-a266-e4d8bf118dd1",
    folder: "main",
    rating: null,
    images: [
      {
        id: "00000000-0000-0000-0000-000000000010",
        fileName: "smoothieBowl-0.jpg",
      },
    ],
    nutrition: null,
    i18nKeys: {
      title: "seed.exampleRecipes.smoothieBowl.title",
      description: "seed.exampleRecipes.smoothieBowl.description",
      yield: "seed.exampleRecipes.smoothieBowl.yield",
      activeTime: "seed.exampleRecipes.smoothieBowl.activeTime",
      totalTime: "seed.exampleRecipes.smoothieBowl.totalTime",
      notes: "seed.exampleRecipes.smoothieBowl.notes",
      ingredients: "seed.exampleRecipes.smoothieBowl.ingredients",
      instructions: "seed.exampleRecipes.smoothieBowl.instructions",
    },
  },
];
