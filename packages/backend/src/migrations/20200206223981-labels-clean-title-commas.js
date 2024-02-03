module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE "Labels" SET title = regexp_replace(
          title,
          ',',
          '',
          'g'
        )
        WHERE title LIKE '%,%';
      `,
        {
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `
        DELETE FROM "Labels" WHERE title = '';
      `,
        {
          transaction,
        },
      );
    });
  },

  down: () => {
    return Promise.resolve();
  },
};
