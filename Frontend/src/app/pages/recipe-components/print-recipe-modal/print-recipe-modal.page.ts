import { Component, Input } from '@angular/core';
import { NavController, ModalController } from '@ionic/angular';

import { RecipeService, Recipe } from '@/services/recipe.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UtilService, RecipeTemplateModifiers } from '@/services/util.service';

export interface PrintOption {
  modifiers: RecipeTemplateModifiers;
  description: string;
  orientation: string;
  url?: SafeResourceUrl;
}

@Component({
  selector: 'page-print-recipe-modal',
  templateUrl: 'print-recipe-modal.page.html',
  styleUrls: ['print-recipe-modal.page.scss']
})
export class PrintRecipeModalPage {

  @Input() recipe: Recipe;

  selectedTemplate = -1;
  templates: PrintOption[] = [{
    modifiers: {
      titleImage: true,
      printPreview: true
    },
    description: 'Standard',
    orientation: 'portrait'
  },
  // {
  //   name: 'halfsheet',
  //   modifiers: '',
  //   description: 'Half Sheet',
  //   orientation: 'landscape'
  // },
  {
    modifiers: {
      printPreview: true
    },
    description: 'Standard No Image',
    orientation: 'portrait'
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
      printPreview: true
    },
    description: 'Half Sheet, Columns',
    orientation: 'landscape'
  },
  {
    modifiers: {
      halfsheet: true,
      verticalInstrIng: true,
      printPreview: true
    },
    description: 'Half Sheet, Compact, No Columns',
    orientation: 'landscape'
  }];

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public sanitizer: DomSanitizer,
    public utilService: UtilService,
    public recipeService: RecipeService) {
    setTimeout(() => {
      for (let i = 0; i < this.templates.length; i++) {
        this.templates[i].url = this.utilService.generateTrustedRecipeTemplateURL(this.recipe.id, this.templates[i].modifiers);
      }
    });
  }


  print() {
    let template = document.getElementById('selectedTemplateFrame');
    try {
      (template as any).contentWindow.print();
    } catch (e) {
      (template as any).contentWindow.postMessage({
        action: 'print'
      }, window.location.origin);
    }
    this.modalCtrl.dismiss();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
