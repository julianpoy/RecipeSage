// NLP

// const training = require('./nlp_recipe_trainingData.js')
// const testing = require('./nlp_recipe_trainingData.js')

const request = require('request-promise');
const tf = require('@tensorflow/tfjs-node');

var natural = require('natural');
var tokenizer = new natural.WordTokenizer();

const noopToken = 'NOOP IGNORE TOKEN';
const dict = [noopToken];

const mapToId = word => {
  let idx = dict.indexOf(word);
  if (idx > -1) return idx;
  idx = dict.length;
  dict.push(word);
  return idx;
}

const padTokens = (tokenSet, expectedLength) => {
  if (tokenSet.length >= expectedLength) return tokenSet;

  const noopTokenIdx = dict.indexOf(noopToken);
  return tokenSet.concat((new Array(expectedLength - tokenSet.length)).fill(noopTokenIdx));
}

const run = async () => {
  const token = 'd2bab6090bf7b20c66e2436dfad4a9a67e14b96103d74302bc24135be6f204e14ceba5458830f229a2569f6504853be5';
  // const data = JSON.parse(await request(
  //   "http://rsdev.localhost/api/recipes/by-page?token=5191456035803de12357a207108399f3fd54bc93223720bac28861d265d44b3affab80925f49efb221919007bce26655&folder=main&sort=-createdAt&count=50"
  // ));
  const data = [];
  while(true) {
    const response = JSON.parse(await request(
      `https://recipesage.com/api/recipes/by-page?token=${token}&folder=main&sort=-createdAt&count=50`
    ));

    data = [...data, ...response.data];

    if (response.totalCount - 50 >= response.length) break;
  }

  const batches = data.map(partialRecipe => partialRecipe.id).reduce((acc, recipeId, idx) => {
    const batchSize = 50;
    const batchIdx = Math.floor(id / batchSize);
    acc[batchIdx] = acc[batchIdx] || [];
    acc[batchIdx].push(recipeId);
    return acc;
  }, []);

  const recipes = batches.map(batch => {
    await Promise.all(batch.map(async recipeId => JSON.parse(await request(`https://recipesage.com/api/recipes/${recipeId}`))));
  });

  // const nlpData = recipes.map(recipe => ({
  //   rawBody: recipe.notes,
  //   tokens: tokenizer.tokenize(recipe.notes).map(mapToId),
  //   instructionStartIdx: recipe.notes.indexOf(recipe.instructions),
  //   instructionEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length,
  //   ingredientStartIdx: recipe.notes.indexOf(recipe.ingredients),
  //   ingredientEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length
  // })).filter(nlpEntry => nlpEntry.tokens.length > 0);
  // const recipes = [{
  //   notes: 'i am george',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'i am george hotz',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'george i am',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'why do you do this george, i am?',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'i am stop george!',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'i am not stop george!',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'i am george but better',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'george is not i am',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'george not go i am',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'george, not go too i am',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'but why, george do you need i am?',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }, {
  //   notes: 'question george, i am?',
  //   instructions: 'george',
  //   ingredients: 'i am'
  // }]
  const nlpData = recipes.map(recipe => ({
    tokens: tokenizer.tokenize(recipe.notes).map(mapToId),
    instructionStartIdx: recipe.notes.indexOf(recipe.instructions),
    instructionEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length,
    ingredientStartIdx: recipe.notes.indexOf(recipe.ingredients),
    ingredientEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length
  })).filter(nlpEntry => nlpEntry.tokens.length > 0 && nlpEntry.instructionStartIdx > -1 && nlpEntry.ingredientStartIdx > -1)
     .sort(() => Math.floor((Math.random() * 3) - 1));

  console.log(nlpData.map(nlp => ({
    instructionStartIdx: nlp.instructionStartIdx,
    instructionEndIdx: nlp.instructionEndIdx,
    ingredientStartIdx: nlp.ingredientStartIdx,
    ingredientEndIdx: nlp.ingredientEndIdx,
  })))

  console.log(nlpData.length)

  const training = nlpData.slice(0, Math.floor(nlpData.length * 0.8))

  const testing = nlpData.slice(Math.floor(nlpData.length * 0.8), nlpData.length)

  const maxTokenLength = nlpData.reduce((acc, item) => Math.max(acc, item.tokens.length), 0)

  const trainingData = tf.tensor2d(training.map(item => [
    ...padTokens(item.tokens, maxTokenLength),
  ]), [training.length, maxTokenLength]);
  const outputData = tf.tensor2d(training.map(item => [
    item.instructionStartIdx,
    item.instructionEndIdx,
    item.ingredientStartIdx,
    item.ingredientEndIdx,
  ]));
  const testingData = tf.tensor2d(testing.map(item => [
    ...padTokens(item.tokens, maxTokenLength),
  ]), [testing.length, maxTokenLength]);

  const model = tf.sequential();

  model.add(tf.layers.lstm({
    units: 4,
    returnSequences: true,
    inputShape: [maxTokenLength]
  }))

  model.add(tf.layers.dense({
    // inputShape: [maxTokenLength],
    activation: "softplus",
    units: dict.length,
  }));
  // model.add(tf.layers.dense({
  //   activation: "softplus",
  //   units: 200,
  // }));
  model.add(tf.layers.dense({
    activation: "softplus",
    units: 4,
  }));
  model.compile({
    loss: "meanSquaredError",
    optimizer: tf.train.adam(0.06), // 0.06
  });
  const startTime = Date.now();
  model.fit(trainingData, outputData, { epochs: 64 || 32, batchSize: 4 })
    .then((history) => {
      console.log(history);
      console.log("Done training in " + (Date.now() - startTime) / 1000 + " seconds.");
      model.predict(testingData).print();
      console.table(testing)
    });
}

run();



