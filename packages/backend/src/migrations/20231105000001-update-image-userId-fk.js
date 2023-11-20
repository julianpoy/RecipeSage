module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "Images"
        DROP CONSTRAINT "Images_userId_fkey";
      `,
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
    );

    await queryInterface.sequelize.query(
      `
        ALTER TABLE "Images"
        DROP CONSTRAINT "Images_userId_fkey1";
      `,
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "Images"
        ADD CONSTRAINT "Images_userId_fkey1"
        FOREIGN KEY ("userId")
        REFERENCES "Users" (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      `,
    );

    await queryInterface.sequelize.query(
      `
        ALTER TABLE "Images"
        DROP CONSTRAINT "Images_userId_fkey";
      `,
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
    );
  },
};
