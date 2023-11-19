module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Delete all duplicate label->recipe relationships
      const duplicateLabels = await queryInterface.sequelize.query(
        `
        SELECT "userId", "title" from "Labels" l
        GROUP BY
            "userId",
            "title"
        HAVING
            COUNT(id) > 1;
      `,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );

      const duplicateLabelTitlesByUserId = {};
      duplicateLabels.map((dupeLabel) => {
        duplicateLabelTitlesByUserId[dupeLabel.userId] =
          duplicateLabelTitlesByUserId[dupeLabel.userId] || [];
        if (
          !duplicateLabelTitlesByUserId[dupeLabel.userId].includes(
            dupeLabel.title,
          )
        ) {
          duplicateLabelTitlesByUserId[dupeLabel.userId].push(dupeLabel.title);
        }
      });

      let labelTitlesUpdated = 0;
      let usersAffected = 0;

      for (
        let i = 0;
        i < Object.keys(duplicateLabelTitlesByUserId).length;
        i++
      ) {
        const userId = Object.keys(duplicateLabelTitlesByUserId)[i];
        const duplicateLabelTitles = duplicateLabelTitlesByUserId[userId];

        for (let j = 0; j < duplicateLabelTitles.length; j++) {
          const duplicateLabelTitle = duplicateLabelTitles[j];

          const duplicateLabelIds = (
            await queryInterface.sequelize.query(
              `
            SELECT id from "Labels" l
            WHERE "userId" = :userId AND title = :title;
          `,
              {
                transaction,
                type: queryInterface.sequelize.QueryTypes.SELECT,
                replacements: {
                  userId,
                  title: duplicateLabelTitle,
                },
              },
            )
          ).map((result) => result.id);

          const finalLabelId = duplicateLabelIds[0];
          duplicateLabelIds.splice(0, 1);

          await queryInterface.sequelize.query(
            `
            UPDATE "Recipe_Labels"
            SET "labelId" = :finalLabelId
            WHERE "labelId" IN(:duplicateLabelIds);
          `,
            {
              transaction,
              replacements: {
                finalLabelId,
                duplicateLabelIds,
              },
            },
          );

          await queryInterface.sequelize.query(
            `
            DELETE FROM "Labels"
            WHERE id IN(:duplicateLabelIds);
          `,
            {
              transaction,
              replacements: {
                duplicateLabelIds,
              },
            },
          );

          labelTitlesUpdated++;
        }

        usersAffected++;
      }

      console.log("Label titles updated:", labelTitlesUpdated);
      console.log("Accounts with labels migrated:", usersAffected);

      await queryInterface.addConstraint("Labels", {
        type: "UNIQUE",
        name: "Labels_userId_title_uk",
        fields: ["userId", "title"],
        transaction,
      });
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeConstraint("Labels", "Labels_userId_title_uk");
  },
};
