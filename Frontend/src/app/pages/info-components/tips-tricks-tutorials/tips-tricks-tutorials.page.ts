import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-tips-tricks-tutorials',
  templateUrl: 'tips-tricks-tutorials.page.html',
  styleUrls: ['tips-tricks-tutorials.page.scss']
})
export class TipsTricksTutorialsPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  active = '';

  tutorials;
  tutorialsByTag;

  constructor() {
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
      icon: 'document-outline',
      tag: 'recipeDetails'
    }, {
      title: 'Clip Tool Browser Extension',
      description: 'The RecipeSage browser plugin',
      icon: 'cut',
      tag: 'webExtension'
    }, {
      title: 'General FAQ',
      description: 'Common questions we receive',
      icon: 'help-outline',
      tag: 'faq'
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
    return this.tutorials.indexOf(this.tutorialsByTag[this.active]) + 1 === this.tutorials.length;
  }

}
