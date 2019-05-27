import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';

import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { DomSanitizer } from '@angular/platform-browser';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-print-recipe-modal',
  templateUrl: 'print-recipe-modal.html',
})
export class PrintRecipeModalPage {

  recipe: any;

  selectedTemplate: any = -1;
  templates: any = [{
    modifiers: [['titleImage', true]],
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
    modifiers: [],
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
    name: 'halfsheet',
    modifiers: [['halfsheet', true]],
    description: 'Half Sheet, Columns',
    orientation: 'landscape'
  },
  {
    modifiers: [['halfsheet', true], ['verticalInstrIng', true]],
    description: 'Half Sheet, Compact, No Columns',
    orientation: 'landscape'
  }];

  base: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public sanitizer: DomSanitizer,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider) {
    this.recipe = navParams.get('recipe');

    this.base = window.location.origin;

    for (var i = 0; i < this.templates.length; i++) {
      let modifierQuery = this.templates[i].modifiers.map(e => e.join('=')).join('&');
      var url = `${this.base}/#/recipe/${this.recipe.id}/print?${modifierQuery}`;
      this.templates[i].url = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  ionViewDidLoad() {}

  print() {
    var template = document.getElementById('selectedTemplateFrame');
    try {
      (<any>template).contentWindow.print();
    } catch(e) {
      (<any>template).contentWindow.postMessage('print', this.base);
    }
    this.viewCtrl.dismiss();
  }

  cancel() {
    this.viewCtrl.dismiss();
  }
}
