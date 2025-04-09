// admin/frontend/src/components/packages/PackageForm.js
import React from 'react';
import { Modal, Form, Input, Switch, InputNumber } from 'antd';

const PackageForm = ({ visible, onCancel, onSubmit, initialValues, isEdit }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onSubmit(values);
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Package' : 'Create Package'}
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ active: true, gems: 0, display_order: 0 }}
      >
        <Form.Item
          name="active"
          label="Active"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="price"
          label="Price ($)"
          rules={[{ required: true, message: 'Please enter the price' }]}
        >
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          name="chips"
          label="Chips"
          rules={[{ required: true, message: 'Please enter the chips amount' }]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
          />
        </Form.Item>
        <Form.Item
          name="gems"
          label="Gems"
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          name="display_order"
          label="Display Order"
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PackageForm;
