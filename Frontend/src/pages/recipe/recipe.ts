import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

import { Recipe } from '../../providers/recipe-service/recipe-service';

import fractionjs from 'fraction.js';

/**
 * Generated class for the RecipePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-recipe',
  templateUrl: 'recipe.html',
})
export class RecipePage {

  recipe: Recipe;
  ingredients: any;
  
  scale: Number;

  constructor(public navCtrl: NavController, public navParams: NavParams) {
    this.recipe = navParams.get('recipe') || <Recipe>{};
    
    this.scale = 1;
    
    this.applyScale();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RecipePage');
  }
  
  setScale(scale) {
    if (!scale || scale <= 0) scale = 1;
    
    scale = parseInt(scale) || 1;
    
    this.scale = scale;

    this.applyScale();
  }
  
  applyScale() {
    
    if (!this.recipe.ingredients) return;
    
    var lines = this.recipe.ingredients.match(/[^\r\n]+/g);
    
    var measurementRegexp = /\d+(.\d+(.\d+)?)?/;
    
    for (var i = 0; i < lines.length; i++) {
      var matches = lines[i].match(measurementRegexp);
      if (!matches || matches.length === 0) continue;
      
      var measurement = matches[0];
      
      var scaledMeasurement = fractionjs(measurement).mul(this.scale);

      // Preserve original fraction format if entered
      if (measurement.indexOf('/') > -1) {
        scaledMeasurement = scaledMeasurement.toFraction(true);
      }
      
      scaledMeasurement = '<b>' + scaledMeasurement + '</b>';
      
      lines[i] = lines[i].replace(measurementRegexp, scaledMeasurement);
    }
    
    this.ingredients = lines;
  }
}
