// migrations/XXXXXX-create-user-inventory.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_inventory', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      item_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      item_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    
    // Add composite index for faster lookups
    await queryInterface.addIndex('user_inventory', ['user_id', 'item_type', 'item_id'], {
      unique: true,
      name: 'user_inventory_unique'
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_inventory');
  }
};
