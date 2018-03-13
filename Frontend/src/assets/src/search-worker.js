self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/fuse.js/3.2.0/fuse.min.js');

var options = {
  shouldSort: true,
  findAllMatches: true,
  includeScore: true,
  threshold: 0.6,
  location: 0,
  distance: 20,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    "title",
    "description",
    "source",
    "ingredients",
    "instructions",
    "notes"
  ]
};

var fuse;
var recipes;

self.addEventListener("message", function(e) {
  var message = JSON.parse(e.data);
  if (message.op === 'init') {
    recipes = message.data;
    fuse = new Fuse(message.data, options);
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