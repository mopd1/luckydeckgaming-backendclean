// admin/frontend/src/components/packages/PackageList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Switch, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import PackageForm from './PackageForm';
import api from '../../services/api';

const PackageList = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/packages/admin/all');
      setPackages(response.data.packages);
    } catch (error) {
      message.error('Failed to fetch packages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleEdit = (record) => {
    setCurrentPackage(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/packages/admin/${id}`);
      message.success('Package deleted successfully');
      fetchPackages();
    } catch (error) {
      message.error('Failed to delete package');
      console.error(error);
    }
  };

  const handleToggleActive = async (id, active) => {
    try {
      await api.put(`/packages/admin/${id}`, { active });
      message.success(`Package ${active ? 'activated' : 'deactivated'} successfully`);
      fetchPackages();
    } catch (error) {
      message.error('Failed to update package status');
      console.error(error);
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      if (currentPackage) {
        await api.put(`/packages/admin/${currentPackage.id}`, values);
        message.success('Package updated successfully');
      } else {
        await api.post('/packages/admin', values);
        message.success('Package created successfully');
      }
      setIsModalVisible(false);
      setCurrentPackage(null);
      fetchPackages();
    } catch (error) {
      message.error('Operation failed');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
    },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active, record) => (
        <Switch 
          checked={active} 
          onChange={(checked) => handleToggleActive(record.id, checked)} 
        />
      ),
    },
    {
      title: 'Price ($)',
      dataIndex: 'price',
      key: 'price',
      width: 100,
    },
    {
      title: 'Chips',
      dataIndex: 'chips',
      key: 'chips',
      width: 150,
      render: (text) => Number(text).toLocaleString(),
    },
    {
      title: 'Gems',
      dataIndex: 'gems',
      key: 'gems',
      width: 100,
    },
    {
      title: 'Display Order',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 120,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this package?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="danger" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => {
            setCurrentPackage(null);
            setIsModalVisible(true);
          }}
        >
          Add Package
        </Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={packages} 
        rowKey="id" 
        loading={loading} 
        pagination={{ pageSize: 10 }}
      />
      <PackageForm
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setCurrentPackage(null);
        }}
        onSubmit={handleFormSubmit}
        initialValues={currentPackage}
        isEdit={!!currentPackage}
      />
    </div>
  );
};

export default PackageList;
