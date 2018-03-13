self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/fuse.js/3.2.0/fuse.min.js');

var options = {
  shouldSort: true,
  includeScore: true,
  threshold: 0.6,
  location: 0,
  distance: 200,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    "title",
    "description",
    "source",
    "ingredients",
    "instructions",
    "notes",
    "labels_flatlist"
  ]
};

var fuse;
var recipes;

self.addEventListener("message", function(e) {
  var message = JSON.parse(e.data);
  if (message.op === 'init') {
    recipes = message.data;
    
    recipes = recipes.map(function(el) {
      if (el.labels.length > 0) {
        el.labels_flatlist = el.labels.map(function(label) {
          return label.title;
        }).join(', ');
      } else {
        el.labels_flatlist = '';
      }
      return el;
    });
    
    fuse = new Fuse(recipes, options);
  } else if (message.op === 'search') {
    if (message.data.trim().length > 0) {
      var results = fuse.search(message.data);
      
      results = results.map(function(el) {
      	var recipe = el.item;
      	recipe.score = el.score;
      	return recipe;
      });
      
      postMessage(JSON.stringify({
        op: 'results',
        data: results
      }));
    } else {
      postMessage(JSON.stringify({
        op: 'results',
        data: recipes
      }));
    }
  }
}, false);