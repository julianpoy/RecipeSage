import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

import { RouteMap, TutorialType } from '@/services/util.service';

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

  constructor(
    public route: ActivatedRoute,
    public navCtrl: NavController,
  ) {
    this.tutorials = [{
      title: 'My Recipes Page',
      description: 'The main page of RecipeSage',
      icon: 'book',
      tag: 'home',
      type: TutorialType.MyRecipes,
    }, {
      title: 'Recipe Create/Edit Page',
      description: 'The authoring experience',
      icon: 'create',
      tag: 'editRecipe',
      type: TutorialType.EditRecipes,
    }, {
      title: 'Recipe Details Page',
      description: 'Individual recipe view',
      icon: 'document-outline',
      tag: 'recipeDetails',
      type: TutorialType.RecipeDetails,
    }, {
      title: 'People & Profile',
      description: 'People and library sharing features',
      icon: 'person-circle',
      tag: 'peopleProfile',
      type: TutorialType.PeopleProfile,
    }, {
      title: 'Clip Tool Browser Extension',
      description: 'The RecipeSage browser plugin',
      icon: 'cut',
      tag: 'webExtension',
      type: TutorialType.BrowserExtension,
    }, {
      title: 'General FAQ',
      description: 'Common questions we receive',
      icon: 'help-outline',
      tag: 'faq',
      type: TutorialType.GeneralFAQ,
    }];

    this.tutorialsByTag = {};
    this.tutorials.forEach(el => this.tutorialsByTag[el.tag] = el);

    const tutorialType = this.route.snapshot.paramMap.get('tutorialType');
    if (tutorialType) {
      const initialTutorial = this.tutorials.find(tutorial => tutorial.type === tutorialType);
      if (initialTutorial) this.active = initialTutorial.tag;
      this.defaultBackHref = RouteMap.TipsTricksTutorialsPage.getPath();
    }
  }

  open(tutorialType: TutorialType) {
    this.navCtrl.navigateForward(RouteMap.TutorialPage.getPath(tutorialType));
  }

  next() {
    const next = this.tutorials[
      this.tutorials.indexOf(this.tutorialsByTag[this.active]) + 1
    ].type;
    this.navCtrl.navigateForward(RouteMap.TutorialPage.getPath(next));
  }

  isLast() {
    return this.tutorials.indexOf(this.tutorialsByTag[this.active]) + 1 === this.tutorials.length;
  }

  close() {
    this.navCtrl.navigateForward(RouteMap.TipsTricksTutorialsPage.getPath());
  }

}
