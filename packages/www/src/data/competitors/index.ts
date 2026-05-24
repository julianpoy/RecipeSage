import { anylist } from "./anylist";
import { bigoven } from "./bigoven";
import { cookmate } from "./cookmate";
import { copymethat } from "./copymethat";
import { crouton } from "./crouton";
import { evernote } from "./evernote";
import { mela } from "./mela";
import { paprika } from "./paprika";
import { pepperplate } from "./pepperplate";
import { planToEat } from "./plan-to-eat";
import { recipeKeeper } from "./recipe-keeper";
import { samsungFood } from "./samsung-food";
import type { CompetitorData } from "./types";

export const competitors: Record<string, CompetitorData> = {
  [paprika.slug]: paprika,
  [planToEat.slug]: planToEat,
  [copymethat.slug]: copymethat,
  [pepperplate.slug]: pepperplate,
  [bigoven.slug]: bigoven,
  [samsungFood.slug]: samsungFood,
  [anylist.slug]: anylist,
  [mela.slug]: mela,
  [crouton.slug]: crouton,
  [recipeKeeper.slug]: recipeKeeper,
  [cookmate.slug]: cookmate,
  [evernote.slug]: evernote,
};

export const competitorSlugs = Object.keys(competitors);

export const competitorList: CompetitorData[] = Object.values(competitors);
