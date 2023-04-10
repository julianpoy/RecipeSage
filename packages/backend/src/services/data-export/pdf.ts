import pdfmake from 'pdfmake';
import { Writable } from 'stream';
import {
  parseIngredients,
  parseInstructions,
  parseNotes
} from '@recipesage/util';
import sanitizeHtml from 'sanitize-html';
import { fetchURLAsBuffer } from '../fetch';

export interface ExportOptions {
  includeImages?: boolean,
  includeImageUrls?: boolean,
}

const parsedToSchema = (parsedItems: any[], includeMargin) => {
  return parsedItems.map((item) => ({
    text: item.content,
    bold: item.isHeader,
    margin: includeMargin ? [0, 0, 0, 5] : []
  }));
}

const recipeToSchema = async (recipe, options?: ExportOptions) => {
  const schema = [];

  const headerContent = [];

  headerContent.push({
    text: recipe.title,
    fontSize: 16
  });

  const showTagLine = recipe.source || recipe.activeTime || recipe.totalTime || recipe.yield;
  if (showTagLine) {
    const tagline = [];

    if (recipe.source) tagline.push(['Source:', recipe.source]);
    if (recipe.activeTime) tagline.push(['Active time:', recipe.activeTime]);
    if (recipe.totalTime) tagline.push(['Total time:', recipe.totalTime]);
    if (recipe.yield) tagline.push(['Yield:', recipe.yield]);

    const taglineSchema = tagline.reduce((acc, item) => {
      return [
        ...acc,
        {
          text: item[0] + ' ',
          bold: true
        },
        {
          text: item[1] + '  ',
        }
      ];
    }, []);

    headerContent.push({
      text: taglineSchema,
      margin: [0, 10, 0, 10] // left top right bottom
    });
  }

  if (recipe.description) {
    headerContent.push({
      text: recipe.description,
      margin: [0, showTagLine ? 0 : 10, 0, 10] // left top right bottom
    });
  }

  const imageUrl = recipe.images[0]?.location;
  if (imageUrl && options?.includeImages) {
    const buffer = await fetchURLAsBuffer(imageUrl);

    schema.push({
      columns: [
        {
          width: 100,
          image: `data:image/jpeg;base64,${buffer.toString('base64')}`,
          fit: [100, 100],
        },
        {
          width: 'auto',
          stack: headerContent,
          margin: [10, 10, 0, 0]
        }
      ],
      margin: [0, 0, 0, 10]
    });
  } else {
    schema.push(...headerContent);
  }

  const parsedInstructions = parseInstructions(sanitizeHtml(recipe.instructions));
  const parsedIngredients = parseIngredients(sanitizeHtml(recipe.ingredients), 1, false);
  const parsedNotes = parseNotes(sanitizeHtml(recipe.notes));
  if (recipe.ingredients && recipe.instructions) {
    schema.push({
      columns: [
        {
          width: 180,
          stack: parsedToSchema(parsedIngredients, true)
        },
        {
          width: 'auto',
          stack: parsedToSchema(parsedInstructions, true)
        }
      ]
    });
  } else if (recipe.ingredients) {
    schema.push({
      text: parsedToSchema(parsedIngredients, true)
    });
  } else if (recipe.instructions) {
    schema.push({
      text: parsedToSchema(parsedInstructions, true)
    });
  }

  if (recipe.notes) {
    const header = {
      text: 'Notes:',
      margin: [0, 10, 0, 5], // left top right bottom
      bold: true
    };
    schema.push(header);
    schema.push(...parsedToSchema(parsedNotes, false));
  }
  if (recipe.url) {
    schema.push({
      text: [
        {
          text: 'Source URL: ',
          bold: true
        },
        {
          text: recipe.url,
          link: recipe.url
        }
      ],
      margin: [0, 10, 0, 0]
    });
  }
  if (options?.includeImageUrls && imageUrl) {
    schema.push({
      text: [
        {
          text: 'Image URL: ',
          bold: true
        },
        {
          text: imageUrl,
          link: imageUrl
        }
      ],
      margin: [0, 10, 0, 0]
    });
  }

  schema.push({
    text: '',
    pageBreak: 'after'
  });

  return schema;
};

// TODO: Support multi language
export const exportToPDF = async (recipes: any[], writeStream: Writable, options?: ExportOptions) => {
  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    },
  };

  const content = [];
  for (const recipe of recipes) {
    content.push(await recipeToSchema(recipe, options));
  }

  const docDefinition = {
    content,
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 10,
      lineHeight: 1.2
    }
  };

  const printer = new pdfmake(fonts);
  const doc = printer.createPdfKitDocument(docDefinition);
  doc.pipe(writeStream);
  doc.end();
};

