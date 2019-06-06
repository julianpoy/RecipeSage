let fractionjs = require('../Backend/node_modules/fraction.js');

function parseIngredients(ingredients, scale, boldify) {
  if (!ingredients) return [];

  let lines = ingredients.match(/[^\r\n]+/g).map(match => ({
    content: match,
    originalContent: match,
    complete: false,
    isHeader: false
  }));

  // var measurementRegexp = /\d+(.\d+(.\d+)?)?/;
  var measurementRegexp = /((\d+ )?\d+([\/\.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([\/\.]\d+)?)|((\d+ )?\d+[\/\.]\d+)|\d+/;
  // Starts with [, anything inbetween, ends with ]
  var headerRegexp = /^\[.*\]$/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].content.trim(); // Trim only spaces (no newlines)

    var measurementMatches = line.match(measurementRegexp);
    var headerMatches = line.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      var header = headerMatches[0];
      var headerContent = header.substring(1, header.length - 1); // Chop off brackets

      if (boldify) headerContent = `<b class="sectionHeader">${headerContent}</b>`;
      lines[i].content = headerContent;
      lines[i].isHeader = true;
    } else if (measurementMatches && measurementMatches.length > 0) {
      var measurement = measurementMatches[0];

      try {
        var measurementParts = measurement.split(/-|to/);

        for (var j = 0; j < measurementParts.length; j++) {
          // console.log(measurementParts[j].trim())
          var scaledMeasurement = fractionjs(measurementParts[j].trim()).mul(scale);

          // Preserve original fraction format if entered
          if (measurementParts[j].indexOf('/') > -1) {
            scaledMeasurement = scaledMeasurement.toFraction(true);
          }

          if (boldify) measurementParts[j] = '<b class="ingredientMeasurement">' + scaledMeasurement + '</b>';
          else measurementParts[j] = scaledMeasurement;
        }

        lines[i].content = lines[i].content.replace(measurementRegexp, measurementParts.join(' to '));
        lines[i].isHeader = false;
      } catch (e) {
        console.log("failed to parse", e)
      }
    }
  }

  return lines;
}

function parseInstructions(instructions) {
  // Starts with [, anything inbetween, ends with ]
  var headerRegexp = /^\[.*\]$/;

  let stepCount = 1;
  return instructions.split(/\r?\n/).map(instruction => {
    let line = instruction.trim();
    var headerMatches = line.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      var header = headerMatches[0];
      var headerContent = header.substring(1, header.length - 1); // Chop off brackets

      stepCount = 1;

      return {
        content: headerContent,
        isHeader: true,
        count: 0,
        complete: false
      }
    } else {
      return {
        content: line,
        isHeader: false,
        count: stepCount++,
        complete: false
      }
    }
  });
}

module.exports = {
  parseIngredients,
  parseInstructions
}
