export const StripePaymentInit = (sequelize, DataTypes) => {
  const StripePayment = sequelize.define(
    "StripePayment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      amountPaid: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerEmail: {
        type: DataTypes.STRING,
      },
      paymentIntentId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      subscriptionId: {
        type: DataTypes.STRING,
      },
      invoiceBlob: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {},
  );
  StripePayment.associate = function (models) {
    StripePayment.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: true,
      },
      onDelete: "CASCADE",
    });
  };
  return StripePayment;
};
