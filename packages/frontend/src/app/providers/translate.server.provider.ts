import { Injectable } from "@angular/core";
import { TranslateLoader, TranslationObject } from "@ngx-translate/core";
import { Observable, of } from "rxjs";

import cs from "../../assets/i18n/cs.json";
import daDk from "../../assets/i18n/da-dk.json";
import deDe from "../../assets/i18n/de-de.json";
import el from "../../assets/i18n/el.json";
import enUs from "../../assets/i18n/en-us.json";
import esEs from "../../assets/i18n/es-es.json";
import eu from "../../assets/i18n/eu.json";
import fi from "../../assets/i18n/fi.json";
import frFr from "../../assets/i18n/fr-fr.json";
import he from "../../assets/i18n/he.json";
import huHu from "../../assets/i18n/hu-hu.json";
import itIt from "../../assets/i18n/it-it.json";
import ja from "../../assets/i18n/ja.json";
import lt from "../../assets/i18n/lt.json";
import nl from "../../assets/i18n/nl.json";
import pl from "../../assets/i18n/pl.json";
import ptBr from "../../assets/i18n/pt-br.json";
import ptPt from "../../assets/i18n/pt-pt.json";
import ro from "../../assets/i18n/ro.json";
import ruRu from "../../assets/i18n/ru-ru.json";
import sv from "../../assets/i18n/sv.json";
import ukUa from "../../assets/i18n/uk-ua.json";
import zhCn from "../../assets/i18n/zh-cn.json";

const TRANSLATIONS: Record<string, TranslationObject> = {
  cs,
  "da-dk": daDk,
  "de-de": deDe,
  el,
  "en-us": enUs,
  "es-es": esEs,
  eu,
  fi,
  "fr-fr": frFr,
  he,
  "hu-hu": huHu,
  "it-it": itIt,
  ja,
  lt,
  nl,
  pl,
  "pt-br": ptBr,
  "pt-pt": ptPt,
  ro,
  "ru-ru": ruRu,
  sv,
  "uk-ua": ukUa,
  "zh-cn": zhCn,
};

@Injectable()
export class ServerTranslateLoader extends TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    const translations =
      TRANSLATIONS[lang.toLowerCase()] ?? TRANSLATIONS["en-us"];
    return of(translations);
  }
}

export function provideServerTranslateLoader() {
  return [{ provide: TranslateLoader, useClass: ServerTranslateLoader }];
}
