import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../../providers/recipe-service/recipe-service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UtilServiceProvider, RecipeTemplateModifiers } from '../../../providers/util-service/util-service';

export interface PrintOption {
  modifiers: RecipeTemplateModifiers,
  description: string,
  orientation: string,
  url?: SafeResourceUrl
}

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-print-recipe-modal',
  templateUrl: 'print-recipe-modal.html',
})
export class PrintRecipeModalPage {

  recipe: Recipe;

  selectedTemplate: number = -1;
  templates: PrintOption[] = [{
    modifiers: {
      titleImage: true,
      forPrinting: true
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
      forPrinting: true
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
      forPrinting: true
    },
    description: 'Half Sheet, Columns',
    orientation: 'landscape'
  },
  {
    modifiers: {
      halfsheet: true,
      verticalInstrIng: true,
      forPrinting: true
    },
    description: 'Half Sheet, Compact, No Columns',
    orientation: 'landscape'
  }];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public sanitizer: DomSanitizer,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider) {
    this.recipe = navParams.get('recipe');

    for (var i = 0; i < this.templates.length; i++) {
      this.templates[i].url = this.utilService.generateRecipeTemplateURL(this.recipe.id, this.templates[i].modifiers, true);
    }
  }

  ionViewDidLoad() {}

  print() {
    var template = document.getElementById('selectedTemplateFrame');
    try {
      (<any>template).contentWindow.print();
    } catch(e) {
      (<any>template).contentWindow.postMessage({
        action: 'print'
      }, window.location.origin);
    }
    this.viewCtrl.dismiss();
  }

  cancel() {
    this.viewCtrl.dismiss();
  }
}
