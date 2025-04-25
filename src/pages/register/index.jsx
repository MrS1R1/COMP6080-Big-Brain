import {Form,Input,Flex,Button,message} from 'antd';
import {IdcardTwoTone} from '@ant-design/icons';
import http from '../../utils/request';
import { useNavigate } from 'react-router';

function Register(){

    const navigate = useNavigate();

    const handleSubmit = (values) =>{
        const {name, email, password} = values;
        const data ={
            email,password,name
        }
        http.post('/admin/auth/register', data)
        .then(res =>{
            if (res && res.token) {
                localStorage.setItem('token', res.token);
                message.success('Registered successfully');
                navigate('/dashboard');
            }
        })
    }

  return (
    <Flex
    style={{ height: '100vh' }}
    justify="center"
    align="center"
    >
        <Form
        name="register"
        style={{maxWidth: 350, width:'50%'}}
        scrollToFirstError
        onFinish={handleSubmit}
        >      
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <IdcardTwoTone style={{ fontSize: 80 }} />
            <h1 style={{ marginTop: 8 }}>Register</h1>
        </div>
            <Form.Item
                name="name"
                label="Name"
                tooltip="Please fill in your name."
                rules={[{ required: true, message: 'Please input your name!', whitespace: true }]}
                hasFeedback
            >
            <Input />
            </Form.Item>
            <Form.Item
                name="email"
                label="E-mail"
                rules={[
                {
                    type: 'email',
                    message: 'The input is not valid E-mail!',
                },
                {
                    required: true,
                    message: 'Please input your E-mail!',
                },
                ]}
                hasFeedback
            >
                <Input />
            </Form.Item>

            <Form.Item
                name="password"
                label="Password"
                rules={[
                {
                    required: true,
                    message: 'Please input your password!',
                },
                ]}
                hasFeedback
            >
                <Input.Password />
            </Form.Item>

            <Form.Item
                name="confirm"
                label="Confirm Password"
                dependencies={['password']}
                hasFeedback
                rules={[
                {
                    required: true,
                    message: 'Please confirm your password!',
                },
                ({ getFieldValue }) => ({
                    validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                    }
                    return Promise.reject(new Error('The new password that you entered do not match!'));
                    },
                }),
                ]}
            >
                <Input.Password />
            </Form.Item>
            <Form.Item>
            <Button type="primary" htmlType="submit" block>
            Register
            </Button>
            </Form.Item>
            Already have an account? <a href="/login">Log in</a>
        </Form>
    </Flex>
  );
};

export default Register;