import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import type { RecipeSummary } from "@recipesage/prisma";
import {
  UtilService,
  RecipeTemplateModifiers,
} from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RecipePreviewComponent } from "../../../components/recipe-preview/recipe-preview.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonLabel,
} from "@ionic/angular/standalone";
import { close, print } from "ionicons/icons";
import { addIcons } from "ionicons";

export interface PrintOption {
  modifiers: RecipeTemplateModifiers;
  description: string;
  orientation: string;
  url: string;
}

@Component({
  standalone: true,
  selector: "page-print-recipe-modal",
  templateUrl: "print-recipe-modal.page.html",
  styleUrls: ["print-recipe-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    RecipePreviewComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonLabel,
  ],
})
export class PrintRecipeModalPage {
  constructor() {
    addIcons({ close, print });
  }

  private translate = inject(TranslateService);
  private modalCtrl = inject(ModalController);
  private utilService = inject(UtilService);

  @Input({
    required: true,
  })
  recipe!: RecipeSummary;
  @Input({
    required: true,
  })
  scale!: string;

  selectedTemplate = -1;
  templates: PrintOption[] = [];

  async ionViewWillEnter() {
    const standard = await this.translate
      .get("pages.printRecipeModal.template.standard")
      .toPromise();
    const standardNoImg = await this.translate
      .get("pages.printRecipeModal.template.standardNoImg")
      .toPromise();
    const halfSheetCols = await this.translate
      .get("pages.printRecipeModal.template.halfSheetCols")
      .toPromise();
    const halfSheetCompactNoCols = await this.translate
      .get("pages.printRecipeModal.template.halfSheetCompactNoCols")
      .toPromise();

    this.templates = [
      {
        modifiers: {
          titleImage: true,
          printPreview: true,
        },
        description: standard,
        orientation: "portrait",
        url: "",
      },
      // {
      //   name: 'halfsheet',
      //   modifiers: '',
      //   description: 'Half Sheet',
      //   orientation: 'landscape'
      // },
      {
        modifiers: {
          printPreview: true,
        },
        description: standardNoImg,
        orientation: "portrait",
        url: "",
      },
      // {
      //   name: 'halfsheet',
      //   modifiers: 'noimage',
      //   description: 'Half Sheet',
      //   orientation: 'landscape'
      // },
      // {
      //   name: 'halfsheet',
      //   modifiers: 'columns',
      //   description: 'Half Sheet, Columns',
      //   orientation: 'landscape'
      // },
      {
        modifiers: {
          halfsheet: true,
          printPreview: true,
        },
        description: halfSheetCols,
        orientation: "landscape",
        url: "",
      },
      {
        modifiers: {
          halfsheet: true,
          verticalInstrIng: true,
          printPreview: true,
        },
        description: halfSheetCompactNoCols,
        orientation: "landscape",
        url: "",
      },
    ];

    const token = this.utilService.getToken();
    for (const template of this.templates) {
      template.modifiers.scale = this.scale;
      template.url = this.utilService.generateRecipeTemplateURL(
        this.recipe.id,
        template.modifiers,
      );
      if (token) template.url += `&token=${token}`;
    }
  }

  print() {
    const template = this.templates[this.selectedTemplate];
    let printUrl = this.utilService.generateRecipeTemplateURL(this.recipe.id, {
      ...template.modifiers,
      print: true,
    });
    const token = this.utilService.getToken();
    if (token) printUrl += `&token=${token}`;
    window.open(printUrl, "_blank", 'rel="noopener"');
    this.modalCtrl.dismiss();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
