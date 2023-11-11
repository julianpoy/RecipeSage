module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "Images"
          DROP CONSTRAINT "Images_userId_fkey";
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE "Images"
          DROP CONSTRAINT "Images_userId_fkey1";
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE "Images"
          ADD CONSTRAINT "Images_userId_fkey"
          FOREIGN KEY ("userId")
          REFERENCES "Users" (id)
          ON DELETE SET NULL
          ON UPDATE CASCADE;
        `,
        {
          transaction,
        }
      );
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          ALTER TABLE "Images"
          DROP CONSTRAINT "Images_userId_fkey";
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE "Images"
          ADD CONSTRAINT "Images_userId_fkey"
          FOREIGN KEY ("userId")
          REFERENCES "Users" (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE;
        `,
        {
          transaction,
        }
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE "Images"
          ADD CONSTRAINT "Images_userId_fkey1"
          FOREIGN KEY ("userId")
          REFERENCES "Users" (id)
          ON DELETE SET NULL
          ON UPDATE CASCADE;
        `,
        {
          transaction,
        }
      );
    });
  },
};
