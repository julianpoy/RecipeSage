import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-tips-tricks-tutorials',
  templateUrl: 'tips-tricks-tutorials.html',
})
export class TipsTricksTutorialsPage {

  active: string = '';

  tutorials;
  tutorialsByTag;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.tutorials = [{
      title: 'My Recipes Page',
      description: 'The main page of RecipeSage',
      icon: 'book',
      tag: 'home'
    }, {
      title: 'Recipe Create/Edit Page',
      description: 'The authoring experience',
      icon: 'create',
      tag: 'editRecipe'
    }, {
      title: 'Recipe Details Page',
      description: 'Individual recipe view',
      icon: 'paper',
      tag: 'recipeDetails'
    }];

    this.tutorialsByTag = {};
    this.tutorials.forEach(el => this.tutorialsByTag[el.tag] = el);
  }

  next() {
    this.active = this.tutorials[
      this.tutorials.indexOf(this.tutorialsByTag[this.active]) + 1
    ].tag;
  }

  isLast() {
    return this.tutorials.indexOf(this.tutorialsByTag[this.active]) + 1 == this.tutorials.length;
  }

}
