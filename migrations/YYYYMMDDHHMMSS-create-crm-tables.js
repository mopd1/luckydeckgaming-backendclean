// migrations/YYYYMMDDHHMMSS-create-crm-tables.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create CRM Characters table
    await queryInterface.createTable('crm_characters', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      avatar_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON object containing avatar configuration'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 2. Create CRM Messages table
    await queryInterface.createTable('crm_messages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      character_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'crm_characters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      message_type: {
        type: Sequelize.ENUM('INFO', 'TASK', 'REWARD'),
        allowNull: false,
        defaultValue: 'INFO'
      },
      task_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        references: {
          model: 'daily_tasks',
          key: 'task_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      task_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional task configuration data'
      },
      reward_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of reward: gems, chips, action_points'
      },
      reward_amount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Amount of reward to give'
      },
      trigger_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of trigger for this message: scene_visit, game_completed, etc.'
      },
      trigger_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional trigger configuration'
      },
      segment_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'User segmentation criteria'
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 3. Create User CRM Messages junction table
    await queryInterface.createTable('user_crm_messages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'crm_messages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      archived: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reward_claimed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // 4. Add indexes for performance
    await queryInterface.addIndex('crm_messages', ['message_type']);
    await queryInterface.addIndex('crm_messages', ['active']);
    await queryInterface.addIndex('crm_messages', ['trigger_type']);
    await queryInterface.addIndex('user_crm_messages', ['user_id']);
    await queryInterface.addIndex('user_crm_messages', ['message_id']);
    await queryInterface.addIndex('user_crm_messages', ['read']);
    await queryInterface.addIndex('user_crm_messages', ['archived']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('user_crm_messages');
    await queryInterface.dropTable('crm_messages');
    await queryInterface.dropTable('crm_characters');
  }
};
