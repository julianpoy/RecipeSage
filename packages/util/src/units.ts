import { uz, Classes, Class, Core, System, Plurality } from "unitz-ts";

Classes.addDefaults();

Core.addClass(
  new Class("Can", [
    {
      system: System.ANY,
      common: true,
      unit: "can",
      baseUnit: "can",
      denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      units: {
        can: Plurality.SINGULAR,
        cans: Plurality.PLURAL,
      },
    },
  ]),
);

Core.addClass(
  new Class("Package", [
    {
      system: System.ANY,
      common: true,
      unit: "package",
      baseUnit: "package",
      denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      units: {
        package: Plurality.SINGULAR,
        packages: Plurality.PLURAL,
      },
    },
  ]),
);

Core.addClass(
  new Class("Pinch", [
    {
      system: System.ANY,
      common: true,
      unit: "pinch",
      baseUnit: "pinch",
      denominators: [2, 3, 4],
      units: {
        pinch: Plurality.SINGULAR,
        pinches: Plurality.PLURAL,
        knsp: Plurality.EITHER,
      },
    },
  ]),
);

Core.getGroup("tablespoon").addUnits({
  tbs: Plurality.SINGULAR,
  spsk: Plurality.EITHER,
});

Core.getGroup("teaspoon").addUnits({
  tsk: Plurality.EITHER,
});

export const unitNames: string[] = Object.keys(Core.classMap)
  .map((className) => Object.keys(Core.classMap[className].groupMap))
  .flat();

export const parseUnit = uz;
