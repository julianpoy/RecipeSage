self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/lunr.js/2.1.6/lunr.min.js');

var l;
var recipes;
var recipesById;

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
    
    recipesById = recipes.reduce(function(map, el) {
      map[el._id] = el;
  	  return map;
    }, {});
    
    l = lunr(function () {
      this.ref('_id');
      this.field("title");
      this.field("description");
      this.field("source");
      this.field("ingredients");
      this.field("instructions");
      this.field("notes");
      this.field("labels_flatlist");
    
      recipes.forEach(function (recipe) {
        this.add(recipe);
      }, this);
    });
  } else if (message.op === 'search') {
    if (message.data.trim().length > 0) {
      var txt = message.data.trim();

      var results = l.search(txt);
      
      // Expand the search to autocomplete
      if (results.length === 0) {
        results = l.search(txt + '*');
        
        // Expand to single distance fuzzy
        if (results.length === 0) {
          results = l.search(txt + '~1');
        }
      }
      
      results = results.map(function(el) {
        var recipe = recipesById[el.ref];
        recipe.score = el.score;
        return recipe;
      });
      
      postMessage(JSON.stringify({
        op: 'results',
        data: results
      }));
    } else {
      var results = recipes.map(function(el) {
        delete el.score;
        return el;
      });
      
      postMessage(JSON.stringify({
        op: 'results',
        data: results
      }));
    }
  }
}, false);