import { Component, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { Recipe } from "~/services/recipe.service";
import { UtilService, RecipeTemplateModifiers } from "~/services/util.service";

export interface PrintOption {
  modifiers: RecipeTemplateModifiers;
  description: string;
  orientation: string;
  url: string;
}

@Component({
  selector: "page-print-recipe-modal",
  templateUrl: "print-recipe-modal.page.html",
  styleUrls: ["print-recipe-modal.page.scss"],
})
export class PrintRecipeModalPage {
  @Input({
    required: true,
  })
  recipe!: Recipe;
  @Input({
    required: true,
  })
  scale!: number;

  selectedTemplate = -1;
  templates: PrintOption[] = [];

  constructor(
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private utilService: UtilService,
  ) {}

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

    for (const template of this.templates) {
      template.modifiers.scale = this.scale;
      template.url = this.utilService.generateRecipeTemplateURL(
        this.recipe.id,
        template.modifiers,
      );
    }
  }

  print() {
    const template = this.templates[this.selectedTemplate];
    const printUrl = this.utilService.generateRecipeTemplateURL(
      this.recipe.id,
      {
        ...template.modifiers,
        print: true,
      },
    );
    window.open(printUrl, "_blank", 'rel="noopener"');
    this.modalCtrl.dismiss();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
