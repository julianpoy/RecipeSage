// NLP

// const training = require('./nlp_recipe_trainingData.js')
// const testing = require('./nlp_recipe_trainingData.js')

const executeInChunks = async (cbs, chunkSize) => {
  if (chunkSize < 1) return Promise.resolve();

  let chunks = [];
  for (let i = 0; i < cbs.length; i += chunkSize) {
    chunks.push(cbs.slice(i, i + chunkSize));
  }

  await chunks.reduce((acc, chunk) => {
    return acc.then(() => {
      return Promise.all(chunk.map(cb => cb()))
    })
  }, Promise.resolve())
}

const request = require('request-promise');
const tf = require('@tensorflow/tfjs-node-gpu');
const fs = require('fs');

var natural = require('natural');
var tokenizer = new natural.WordTokenizer();

const noopToken = 'NOOP IGNORE TOKEN';
const dict = [noopToken];

const noopTokenIdx = dict.indexOf(noopToken);

const mapToId = word => {
  let idx = dict.indexOf(word);
  if (idx > -1) return idx;
  idx = dict.length;
  dict.push(word);
  return idx;
}

const padTokens = (tokenSet, expectedLength) => {
  if (tokenSet.length >= expectedLength) return tokenSet;

  return tokenSet.concat((new Array(expectedLength - tokenSet.length)).fill(noopTokenIdx));
}

const run = async () => {
  const token = 'd2bab6090bf7b20c66e2436dfad4a9a67e14b96103d74302bc24135be6f204e14ceba5458830f229a2569f6504853be5';
  // const data = JSON.parse(await request(
  //   "http://rsdev.localhost/api/recipes/by-page?token=5191456035803de12357a207108399f3fd54bc93223720bac28861d265d44b3affab80925f49efb221919007bce26655&folder=main&sort=-createdAt&count=50"
  // ));
  // let data = [];
  // while(true) {
  //   const response = JSON.parse(await request(
  //     `https://recipesage.com/api/recipes/by-page?token=${token}&folder=main&sort=-createdAt&count=500&offset=${data.length}`
  //   ));

  //   data = [...data, ...response.data];

  //   if (response.totalCount - 50 <= data.length) break;
  // }

  // data = data.map(partialRecipe => partialRecipe.id)

  // const recipes = [];

  // await executeInChunks(data.map(recipeId => () => {
  //   return new Promise((resolve, reject) => {
  //     setTimeout(async () => {
  //       recipes.push(JSON.parse(await request(`https://recipesage.com/api/recipes/${recipeId}`)))
  //       resolve();
  //     }, 500);
  //   })
  // }), 4);

  // fs.writeFileSync('tmp', JSON.stringify(recipes));

  const recipes = JSON.parse(fs.readFileSync('tmp'));

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
  // const nlpData = recipes.map(recipe => ({
  //   tokens: tokenizer.tokenize(recipe.notes).map(mapToId),
  //   instructionStartIdx: recipe.notes.indexOf(recipe.instructions),
  //   instructionEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length,
  //   ingredientStartIdx: recipe.notes.indexOf(recipe.ingredients),
  //   ingredientEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length
  // })).filter(nlpEntry => nlpEntry.tokens.length > 0 && nlpEntry.instructionStartIdx > -1 && nlpEntry.ingredientStartIdx > -1)
  //    .sort(() => Math.floor((Math.random() * 3) - 1));

  // console.log(nlpData.map(nlp => ({
  //   instructionStartIdx: nlp.instructionStartIdx,
  //   instructionEndIdx: nlp.instructionEndIdx,
  //   ingredientStartIdx: nlp.ingredientStartIdx,
  //   ingredientEndIdx: nlp.ingredientEndIdx,
  // })))

  // console.log(nlpData.length)

  // const training = nlpData.slice(0, Math.floor(nlpData.length * 0.8))

  // const testing = nlpData.slice(Math.floor(nlpData.length * 0.8), nlpData.length)

  // const maxTokenLength = nlpData.reduce((acc, item) => Math.max(acc, item.tokens.length), 0)

  // const trainingData = tf.tensor2d(training.map(item => [
  //   ...padTokens(item.tokens, maxTokenLength),
  // ]), [training.length, maxTokenLength]);
  // const outputData = tf.tensor2d(training.map(item => [
  //   item.instructionStartIdx,
  //   item.instructionEndIdx,
  //   item.ingredientStartIdx,
  //   item.ingredientEndIdx,
  // ]));
  // const testingData = tf.tensor2d(testing.map(item => [
  //   ...padTokens(item.tokens, maxTokenLength),
  // ]), [testing.length, maxTokenLength]);

  // const model = tf.sequential();

  // model.add(tf.layers.lstm({
  //   units: 4,
  //   returnSequences: true,
  //   inputShape: [maxTokenLength]
  // }))

  // model.add(tf.layers.dense({
  //   // inputShape: [maxTokenLength],
  //   activation: "softplus",
  //   units: dict.length,
  // }));
  // // model.add(tf.layers.dense({
  // //   activation: "softplus",
  // //   units: 200,
  // // }));
  // model.add(tf.layers.dense({
  //   activation: "softplus",
  //   units: 4,
  // }));
  // model.compile({
  //   loss: "meanSquaredError",
  //   optimizer: tf.train.adam(0.06), // 0.06
  // });

  const filterZeroLength = line => line.trim().length > 0;

  // let nlpData = [];
  let instructions = [];
  let ingredients = [];
  let notes = [];
  let undesiredData = [];
  recipes.forEach(recipe => {
    instructions.push(...recipe.instructions.split('\n').filter(filterZeroLength).map(line => ({
      tokens: tokenizer.tokenize(line).map(mapToId),
      type: 3
    })));

    ingredients.push(...recipe.ingredients.split('\n').filter(filterZeroLength).map(line => ({
      tokens: tokenizer.tokenize(line).map(mapToId),
      type: 2
    })));

    notes.push(...recipe.notes.split('\n').filter(filterZeroLength).map(line => ({
      tokens: tokenizer.tokenize(line).map(mapToId),
      type: 1
    })));
  });

  const randomStrings = fs.readFileSync('./tmp-randomstrings').toString().split('\n').map(el => el.trim()).filter(el => el.length > 0)
  undesiredData.push(...randomStrings.map(line => ({
    tokens: tokenizer.tokenize(line).map(mapToId),
    type: 4
  })));

  const minNum = Math.min(instructions.length, ingredients.length, notes.length, undesiredData.length);

  let nlpData = [...instructions.slice(0, minNum - 1), ...ingredients.slice(0, minNum - 1), ...notes.slice(0, minNum - 1), ...undesiredData.slice(0, minNum - 1)];

  nlpData = nlpData.sort(() => Math.floor((Math.random() * 3) - 1));

  // const nlpData = recipes.map(recipe => ({
  //   : tokenizer.tokenize(recipe.).map(mapToId),
  //   instructionStartIdx: recipe.notes.indexOf(recipe.instructions),
  //   instructionEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length,
  //   ingredientStartIdx: recipe.notes.indexOf(recipe.ingredients),
  //   ingredientEndIdx: recipe.notes.indexOf(recipe.instructions) + recipe.instructions.length
  // })).filter(nlpEntry => nlpEntry.tokens.length > 0 && nlpEntry.instructionStartIdx > -1 && nlpEntry.ingredientStartIdx > -1)
  //    .sort(() => Math.floor((Math.random() * 3) - 1));

  // console.log(nlpData.map(nlp => ({
  //   instructionStartIdx: nlp.instructionStartIdx,
  //   instructionEndIdx: nlp.instructionEndIdx,
  //   ingredientStartIdx: nlp.ingredientStartIdx,
  //   ingredientEndIdx: nlp.ingredientEndIdx,
  // })))

  // nlpData = [{ tokens: [1, 2], type: 5.0 }, { tokens: [2], type: 5 }, { tokens: [3], type: 5 }, { tokens: [1], type: 5 }, { tokens: [2], type: 5 }, { tokens: [1], type: 5 }, { tokens: [3], type: 5 }, { tokens: [1], type: 5 }, { tokens: [1], type: 5 }]

  console.log(nlpData.length)

  const training = nlpData.slice(0, Math.floor(nlpData.length * 0.95))

  const testing = nlpData.slice(Math.floor(nlpData.length * 0.95), nlpData.length)

  const maxTokenLength = nlpData.reduce((acc, item) => Math.max(acc, item.tokens.length), 0)

  const trainingData = tf.tensor2d(training.map(item => [
    ...padTokens(item.tokens, maxTokenLength),
  ]), [training.length, maxTokenLength]);
  const outputData = tf.tensor2d(training.map(item => [
    item.type == 1 ? 1 : 0,
    item.type == 2 ? 1 : 0,
    item.type == 3 ? 1 : 0,
    item.type == 4 ? 1 : 0
  ]));
  const testingData = tf.tensor2d(testing.map(item => [
    ...padTokens(item.tokens, maxTokenLength),
  ]), [testing.length, maxTokenLength]);

  const model = tf.sequential();

  // model.add(tf.layers.lstm({
  //   units: 4,
  //   returnSequences: true,
  //   inputShape: [maxTokenLength]
  // }))

  // model.add(tf.layers.dense({
  //   inputShape: [maxTokenLength],
  //   activation: "softplus",
  //   units: 1 || dict.length,
  // }));
  // model.add(tf.layers.dense({
  //   activation: "softplus",
  //   units: 200,
  // }));
  // model.add(tf.layers.dense({
  //   activation: "softplus",
  //   units: 1,
  // }));
  model.add(tf.layers.embedding({
    inputDim: dict.length,
    outputDim: 64,
    inputLength: maxTokenLength
  }));
  model.add(tf.layers.bidirectional({ layer: tf.layers.lstm({ units: 64 }), mergeMode: 'concat' }));
  // model.add(tf.layers.dropout({ rate: 0.5 }));
  // model.add(tf.layers.conv1d({
  //   filters: 250,
  //   kernelSize: 5,
  //   strides: 1,
  //   padding: 'valid',
  //   activation: 'relu'
  // }));
  // model.add(tf.layers.globalMaxPool1d({}));
  // model.add(tf.layers.dense({ units: 250, activation: 'relu' }));
  // model.add(tf.layers.lstm({ units: 1 }));
  // model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  // model.add(tf.layers.dense({
  //   // inputShape: [maxTokenLength],
  //   activation: 'relu',
  //   units: 64
  // }));
  // model.add(tf.layers.dense({
  //   inputShape: [maxTokenLength],
  //   activation: 'relu',
  //   units: 128
  // }));
  // model.add(tf.layers.dense({
  //   activation: "softplus",
  //   units: 16,
  // }));
  // model.add(tf.layers.dense({
  //   activation: 'relu',
  //   units: 1
  // }));
  model.add(tf.layers.dense({ units: 4, activation: 'sigmoid' }));

  model.compile({
    loss: "binaryCrossentropy",
    optimizer: tf.train.adam(1e-5), // 0.06
  });
  const startTime = Date.now();
  model.fit(trainingData, outputData, { epochs: 512, batchSize: 128, validationSplit: 0.1 })
    .then(async (history) => {
      console.log(history);
      console.log("Done training in " + (Date.now() - startTime) / 1000 + " seconds.");
      // console.log(testing.slice(0, 4).map(el => el.type))
      // const prediction = model.predict(testingData)
      // prediction.print();

      const results = testing.map(testItem => {
        const t = tf.tensor2d([...padTokens(testItem.tokens, maxTokenLength)], [1, maxTokenLength])
        const predictOut = model.predict(t);
        const score = predictOut.dataSync();
        scoreMax = score.reduce((acc, el) => Math.max(el, acc), 0);
        const chosenType = score.indexOf(scoreMax) + 1;
        console.log(score, chosenType, testItem.type, chosenType == testItem.type);
        return chosenType == testItem.type;
      })

      console.log(results.reduce((acc, item) => acc = item ? acc + 1 : acc, 0), results.length)

      console.log('Saving model...');

      fs.writeFileSync('/home/julian/Code/chefbook/nlp-model-meta', JSON.stringify({
        training,
        testing,
        results,
        nlpData,
        dict,
        maxTokenLength,
        noopToken,

      }))

      await model.save('file:///home/julian/Code/chefbook/nlp-model-save');

      // const [testLoss, testAcc] =
      //   model.evaluate(testingData, testingDataOutput, { batchSize: 128 });
      // console.log(`Evaluation loss: ${(await testLoss.data())[0].toFixed(4)}`);
      // console.log(`Evaluation accuracy: ${(await testAcc.data())[0].toFixed(4)}`);
      // console.log(prediction)
      // console.table(testing.map((result, idx) => ({ ...result, correct: training[idx].type })))
    });
}

run();



