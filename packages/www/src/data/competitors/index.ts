import { anylist } from "./anylist";
import { appleNotes } from "./apple-notes";
import { bigoven } from "./bigoven";
import { cookbookmanager } from "./cookbookmanager";
import { cookmate } from "./cookmate";
import { copymethat } from "./copymethat";
import { crouton } from "./crouton";
import { evernote } from "./evernote";
import { flavorish } from "./flavorish";
import { googleKeep } from "./google-keep";
import { mela } from "./mela";
import { notion } from "./notion";
import { obsidian } from "./obsidian";
import { paprika } from "./paprika";
import { pepperplate } from "./pepperplate";
import { planToEat } from "./plan-to-eat";
import { recipeKeeper } from "./recipe-keeper";
import { samsungFood } from "./samsung-food";
import { tandoor } from "./tandoor";
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
  [cookbookmanager.slug]: cookbookmanager,
  [flavorish.slug]: flavorish,
  [tandoor.slug]: tandoor,
  [evernote.slug]: evernote,
  [appleNotes.slug]: appleNotes,
  [googleKeep.slug]: googleKeep,
  [notion.slug]: notion,
  [obsidian.slug]: obsidian,
};

export const competitorSlugs = Object.keys(competitors);

export const competitorList: CompetitorData[] = Object.values(competitors);
