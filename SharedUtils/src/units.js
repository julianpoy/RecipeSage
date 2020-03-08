const Unitz = require('unitz-ts');

Unitz.Classes.addDefaults();

Unitz.Core.addClass(new Unitz.Class('Can', [{
  system: Unitz.System.ANY,
  common: true,
  unit: 'can',
  baseUnit: 'can',
  denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  units: {
    'can': Unitz.Plurality.SINGULAR,
    'cans': Unitz.Plurality.PLURAL,
  }
}]));

Unitz.Core.addClass(new Unitz.Class('Package', [{
  system: Unitz.System.ANY,
  common: true,
  unit: 'package',
  baseUnit: 'package',
  denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  units: {
    'package': Unitz.Plurality.SINGULAR,
    'packages': Unitz.Plurality.PLURAL,
  }
}]));

Unitz.Core.getGroup('tablespoon').addUnits({
  'tbs': Unitz.Plurality.SINGULAR
});

const unitNames = [].concat.apply([], Object.keys(Unitz.Core.classMap).map(className => Object.keys(Unitz.Core.classMap[className].groupMap)));

module.exports = {
  Unitz,
  unitNames,
};

