import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';

import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { DomSanitizer } from '@angular/platform-browser';

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
    name: 'default',
    modifiers: '',
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
    name: 'default',
    modifiers: 'noimage',
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
    modifiers: 'noimage,columns',
    description: 'Half Sheet, Columns',
    orientation: 'landscape'
  },
  {
    name: 'compact',
    modifiers: '',
    description: 'Half Sheet, Compact, No Columns',
    orientation: 'landscape'
  }];

  base: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public sanitizer: DomSanitizer,
    public recipeService: RecipeServiceProvider) {
    this.recipe = navParams.get('recipe');

    this.base = localStorage.getItem('base') || '/api/';

    for (var i = 0; i < this.templates.length; i++) {
      var url = this.base + 'print' + this.getTokenQuery() + '&recipeId=' + this.recipe._id + '&template=' + this.templates[i].name + '&modifiers=' + this.templates[i].modifiers;
      this.templates[i].url = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
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
